package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.WeeklyReportCreateDTO;
import com.pinecni.erp.api.document.dto.WeeklyReportDTO;
import com.pinecni.erp.api.document.dto.WeeklyReportUpdateDTO;
import com.pinecni.erp.api.document.mapper.WeeklyReportMapper;
import com.pinecni.erp.api.document.repository.WeeklyReportRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.entity.WeeklyReport;
import com.pinecni.erp.entity.Project;
import com.pinecni.erp.entity.ApprovalDocument;
import com.pinecni.erp.service.PdfGenerationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * WeeklyReport Service Implementation
 * 실제 비즈니스 로직 구현
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WeeklyReportServiceImpl implements WeeklyReportService {

    private final WeeklyReportRepository weeklyReportRepository;
    private final WeeklyReportMapper weeklyReportMapper;
    private final UserRepository userRepository;
    private final CodeRepository codeRepository;
    private final ProjectRepository projectRepository;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final PdfGenerationService pdfGenerationService;
    private final com.pinecni.erp.api.document.repository.WeeklyReportOfficialPdfRepository weeklyReportOfficialPdfRepository;

    @Override
    @Transactional
    public WeeklyReportDTO createWeeklyReport(WeeklyReportCreateDTO createDTO) {
        log.debug("createWeeklyReport() called - userIdx: {}", createDTO.getUserIdx());

        try {
            // DTO → Entity 변환
            WeeklyReport weeklyReport = weeklyReportMapper.toEntity(createDTO);

            // 생성 시간 설정
            LocalDateTime now = LocalDateTime.now();
            weeklyReport.setCreatedAt(now);
            weeklyReport.setUpdatedAt(now);

            // 생성자 정보 설정
            if (weeklyReport.getCreatedUserIdx() == null) {
                weeklyReport.setCreatedUserIdx(createDTO.getUserIdx());
            }

            // 프로젝트 달성률 업데이트 (inputProgressRate가 있고 projectIdx가 있는 경우)
            if (createDTO.getProjectIdx() != null && createDTO.getInputProgressRate() != null) {
                projectRepository.findById(createDTO.getProjectIdx()).ifPresent(project -> {
                    java.math.BigDecimal newRate = createDTO.getInputProgressRate();
                    // 100%를 초과하지 않도록 제한
                    if (newRate.compareTo(new java.math.BigDecimal("100")) > 0) {
                        newRate = new java.math.BigDecimal("100");
                    }
                    project.setProgressRate(newRate);
                    project.setUpdatedAt(now);
                    project.setUpdatedUserIdx(createDTO.getUserIdx());
                    projectRepository.save(project);
                    log.debug("Project progressRate updated - projectIdx: {}, newRate: {}",
                        createDTO.getProjectIdx(), newRate);
                });
            }

            // === 1. ApprovalDocument 메타데이터 저장 ===
            String documentNo = "PROJECT-WEEKLY-" + System.currentTimeMillis() + "-" + createDTO.getUserIdx();
            String title = "프로젝트 주간업무보고";
            if (createDTO.getReportPeriod() != null && !createDTO.getReportPeriod().isEmpty()) {
                title = "프로젝트 주간업무보고 - " + createDTO.getReportPeriod();
            }

            ApprovalDocument approvalDocument = ApprovalDocument.builder()
                    .documentNo(documentNo)
                    .title(title)
                    .documentType("프로젝트 주간업무보고")
                    .isProject(true)  // 프로젝트 문서로 표시
                    .drafterUserIdx(createDTO.getUserIdx())
                    .content(createDTO.getMainTasks())
                    .createdUserIdx(createDTO.getUserIdx())
                    .updatedUserIdx(createDTO.getUserIdx())
                    .build();

            ApprovalDocument savedDocument = approvalDocumentRepository.save(approvalDocument);
            log.debug("ApprovalDocument created - documentIdx: {}, documentNo: {}",
                      savedDocument.getIdx(), savedDocument.getDocumentNo());

            // === 2. WeeklyReport에 documentIdx 연결 ===
            weeklyReport.setDocumentIdx(savedDocument.getIdx());

            // 저장
            WeeklyReport saved = weeklyReportRepository.save(weeklyReport);
            log.debug("WeeklyReport created successfully - id: {}, documentIdx: {}",
                      saved.getId(), saved.getDocumentIdx());

            // === PDF 생성 및 저장 ===
            generateAndSaveWeeklyReportPdf(createDTO, saved, savedDocument);

            // Entity → DTO 변환
            WeeklyReportDTO dto = weeklyReportMapper.toDTO(saved);
            // User 정보 조회 및 설정
            userRepository.findById(saved.getUserIdx()).ifPresent(user -> {
                dto.setUserName(user.getEmpName());
                dto.setUserDept(user.getEmpDept());
                // 부서 이름 조회
                if (user.getEmpDept() != null) {
                    codeRepository.findByCode(user.getEmpDept()).ifPresent(code -> {
                        dto.setUserDeptName(code.getCodeName());
                    });
                }
            });
            // 프로젝트 이름 조회 (projectIdx가 있고 projectName이 없는 경우)
            if (saved.getProjectIdx() != null && (dto.getProjectName() == null || dto.getProjectName().isEmpty())) {
                projectRepository.findById(saved.getProjectIdx()).ifPresent(project -> {
                    dto.setProjectName(project.getProjectName());
                });
            }
            return dto;

        } catch (Exception e) {
            log.error("프로젝트 주간업무보고 생성 실패 - userIdx: {}, error: {}", createDTO.getUserIdx(), e.getMessage(), e);
            throw new RuntimeException("프로젝트 주간업무보고 저장 중 오류가 발생했습니다.\n잠시 후 다시 시도하거나 관리자에게 문의해주세요.", e);
        }
    }

    @Override
    public List<WeeklyReportDTO> getAllWeeklyReport() {
        log.debug("getAllWeeklyReport() called");
        List<WeeklyReport> reports = weeklyReportRepository.findAllOrderByCreatedAtDesc();
        log.debug("Found {} weekly reports", reports.size());

        // Entity List → DTO List 변환
        return reports.stream()
                .map(report -> {
                    WeeklyReportDTO dto = weeklyReportMapper.toDTO(report);
                    // User 정보 조회 및 설정
                    userRepository.findById(report.getUserIdx()).ifPresent(user -> {
                        dto.setUserName(user.getEmpName());
                        dto.setUserDept(user.getEmpDept());
                        // 부서 이름 조회
                        if (user.getEmpDept() != null) {
                            codeRepository.findByCode(user.getEmpDept()).ifPresent(code -> {
                                dto.setUserDeptName(code.getCodeName());
                            });
                        }
                    });
                    // 프로젝트 이름 조회 (projectIdx가 있고 projectName이 없는 경우)
                    if (report.getProjectIdx() != null && (dto.getProjectName() == null || dto.getProjectName().isEmpty())) {
                        projectRepository.findById(report.getProjectIdx()).ifPresent(project -> {
                            dto.setProjectName(project.getProjectName());
                        });
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    public WeeklyReportDTO getWeeklyReportById(Long id) {
        log.debug("getWeeklyReportById() called - id: {}", id);
        WeeklyReport report = weeklyReportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("주간업무보고를 찾을 수 없습니다. ID: " + id));
        log.debug("WeeklyReport found - id: {}", report.getId());

        // Entity → DTO 변환
        WeeklyReportDTO dto = weeklyReportMapper.toDTO(report);
        // User 정보 조회 및 설정
        userRepository.findById(report.getUserIdx()).ifPresent(user -> {
            dto.setUserName(user.getEmpName());
            dto.setUserDept(user.getEmpDept());
            // 부서 이름 조회
            if (user.getEmpDept() != null) {
                codeRepository.findByCode(user.getEmpDept()).ifPresent(code -> {
                    dto.setUserDeptName(code.getCodeName());
                });
            }
        });
        // 프로젝트 이름 조회 (projectIdx가 있고 projectName이 없는 경우)
        if (report.getProjectIdx() != null && (dto.getProjectName() == null || dto.getProjectName().isEmpty())) {
            projectRepository.findById(report.getProjectIdx()).ifPresent(project -> {
                dto.setProjectName(project.getProjectName());
            });
        }
        return dto;
    }

    @Override
    @Transactional
    public WeeklyReportDTO updateWeeklyReport(Long id, WeeklyReportUpdateDTO updateDTO, Long updatedUserIdx) {
        log.debug("updateWeeklyReport() called - id: {}, updatedUserIdx: {}", id, updatedUserIdx);

        // 기존 Entity 조회
        WeeklyReport report = weeklyReportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("주간업무보고를 찾을 수 없습니다. ID: " + id));

        // UpdateDTO로 Entity 업데이트
        weeklyReportMapper.updateEntity(report, updateDTO, updatedUserIdx);

        // 프로젝트 달성률 업데이트 (inputProgressRate가 있고 projectIdx가 있는 경우)
        if (updateDTO.getProjectIdx() != null && updateDTO.getInputProgressRate() != null) {
            projectRepository.findById(updateDTO.getProjectIdx()).ifPresent(project -> {
                java.math.BigDecimal newRate = updateDTO.getInputProgressRate();
                // 100%를 초과하지 않도록 제한
                if (newRate.compareTo(new java.math.BigDecimal("100")) > 0) {
                    newRate = new java.math.BigDecimal("100");
                }
                project.setProgressRate(newRate);
                project.setUpdatedAt(LocalDateTime.now());
                project.setUpdatedUserIdx(updatedUserIdx);
                projectRepository.save(project);
                log.debug("Project progressRate updated - projectIdx: {}, newRate: {}",
                    updateDTO.getProjectIdx(), newRate);
            });
        }

        // 연결된 ApprovalDocument도 업데이트
        if (report.getDocumentIdx() != null) {
            approvalDocumentRepository.findById(report.getDocumentIdx()).ifPresent(approvalDocument -> {
                // 제목 업데이트
                String title = "프로젝트 주간업무보고";
                if (updateDTO.getReportPeriod() != null && !updateDTO.getReportPeriod().isEmpty()) {
                    title = "프로젝트 주간업무보고 - " + updateDTO.getReportPeriod();
                }
                approvalDocument.setTitle(title);

                // 내용 업데이트 (mainTasks)
                if (updateDTO.getMainTasks() != null) {
                    approvalDocument.setContent(updateDTO.getMainTasks());
                }

                // 수정 정보 업데이트
                approvalDocument.setUpdatedUserIdx(updatedUserIdx);
                approvalDocument.setUpdatedAt(LocalDateTime.now());

                approvalDocumentRepository.save(approvalDocument);
                log.debug("ApprovalDocument updated - documentIdx: {}", report.getDocumentIdx());
            });
        }

        // 저장 (dirty checking에 의해 자동 업데이트)
        WeeklyReport updated = weeklyReportRepository.save(report);
        log.debug("WeeklyReport updated successfully - id: {}", updated.getId());

        // Entity → DTO 변환
        WeeklyReportDTO dto = weeklyReportMapper.toDTO(updated);
        // User 정보 조회 및 설정
        userRepository.findById(updated.getUserIdx()).ifPresent(user -> {
            dto.setUserName(user.getEmpName());
            dto.setUserDept(user.getEmpDept());
            // 부서 이름 조회
            if (user.getEmpDept() != null) {
                codeRepository.findByCode(user.getEmpDept()).ifPresent(code -> {
                    dto.setUserDeptName(code.getCodeName());
                });
            }
        });
        return dto;
    }

    @Override
    @Transactional
    public void deleteWeeklyReport(Long id) {
        log.debug("deleteWeeklyReport() called - id: {}", id);

        // WeeklyReport 조회 (documentIdx 가져오기 위함)
        WeeklyReport report = weeklyReportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("주간업무보고를 찾을 수 없습니다. ID: " + id));

        // 연결된 ApprovalDocument 소프트 딜리트 (deletedAt, deletedUserIdx 설정)
        if (report.getDocumentIdx() != null) {
            approvalDocumentRepository.findById(report.getDocumentIdx()).ifPresent(approvalDocument -> {
                LocalDateTime now = LocalDateTime.now();
                approvalDocument.setDeletedAt(now);

                // 삭제자 정보 설정 (WeeklyReport의 updatedUserIdx 또는 userIdx 사용)
                Long deletedUserIdx = report.getUpdatedUserIdx() != null ?
                    report.getUpdatedUserIdx() : report.getUserIdx();
                approvalDocument.setDeletedUserIdx(deletedUserIdx);

                approvalDocumentRepository.save(approvalDocument);
                log.debug("ApprovalDocument soft deleted - documentIdx: {}, deletedAt: {}, deletedUserIdx: {}",
                    report.getDocumentIdx(), now, deletedUserIdx);
            });
        }

        // WeeklyReport는 실제 삭제 (hard delete)
        weeklyReportRepository.deleteById(id);
        log.debug("WeeklyReport deleted successfully - id: {}", id);
    }

    @Override
    public List<WeeklyReportDTO> getWeeklyReportsByProjectIdx(Long projectIdx) {
        log.debug("getWeeklyReportsByProjectIdx() called - projectIdx: {}", projectIdx);

        List<WeeklyReport> reports = weeklyReportRepository.findByProjectIdx(projectIdx);
        log.debug("Found {} weekly reports for project {}", reports.size(), projectIdx);

        // Entity List → DTO List 변환
        return reports.stream()
                .map(report -> {
                    WeeklyReportDTO dto = weeklyReportMapper.toDTO(report);
                    // User 정보 조회 및 설정
                    userRepository.findById(report.getUserIdx()).ifPresent(user -> {
                        dto.setUserName(user.getEmpName());
                        dto.setUserDept(user.getEmpDept());
                        // 부서 이름 조회
                        if (user.getEmpDept() != null) {
                            codeRepository.findByCode(user.getEmpDept()).ifPresent(code -> {
                                dto.setUserDeptName(code.getCodeName());
                            });
                        }
                    });
                    // 프로젝트 이름 조회 (projectIdx가 있고 projectName이 없는 경우)
                    if (report.getProjectIdx() != null && (dto.getProjectName() == null || dto.getProjectName().isEmpty())) {
                        projectRepository.findById(report.getProjectIdx()).ifPresent(project -> {
                            dto.setProjectName(project.getProjectName());
                        });
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    public WeeklyReportDTO getWeeklyReportByDocumentIdx(Long documentIdx) {
        log.debug("getWeeklyReportByDocumentIdx() called - documentIdx: {}", documentIdx);
        WeeklyReport report = weeklyReportRepository.findByDocumentIdx(documentIdx)
                .orElseThrow(() -> new RuntimeException("주간업무보고를 찾을 수 없습니다. DocumentIdx: " + documentIdx));
        log.debug("WeeklyReport found - id: {}, documentIdx: {}", report.getId(), report.getDocumentIdx());

        // Entity → DTO 변환
        WeeklyReportDTO dto = weeklyReportMapper.toDTO(report);
        // User 정보 조회 및 설정
        userRepository.findById(report.getUserIdx()).ifPresent(user -> {
            dto.setUserName(user.getEmpName());
            dto.setUserDept(user.getEmpDept());
            // 부서 이름 조회
            if (user.getEmpDept() != null) {
                codeRepository.findByCode(user.getEmpDept()).ifPresent(code -> {
                    dto.setUserDeptName(code.getCodeName());
                });
            }
        });
        // 프로젝트 이름 조회 (projectIdx가 있고 projectName이 없는 경우)
        if (report.getProjectIdx() != null && (dto.getProjectName() == null || dto.getProjectName().isEmpty())) {
            projectRepository.findById(report.getProjectIdx()).ifPresent(project -> {
                dto.setProjectName(project.getProjectName());
            });
        }
        return dto;
    }

    @Override
    @Transactional
    public void deleteWeeklyReportByDocumentIdx(Long documentIdx) {
        log.debug("deleteWeeklyReportByDocumentIdx() called - documentIdx: {}", documentIdx);

        // WeeklyReport 조회
        WeeklyReport report = weeklyReportRepository.findByDocumentIdx(documentIdx)
                .orElseThrow(() -> new RuntimeException("주간업무보고를 찾을 수 없습니다. DocumentIdx: " + documentIdx));

        // 연결된 ApprovalDocument 소프트 딜리트 (deletedAt, deletedUserIdx 설정)
        approvalDocumentRepository.findById(documentIdx).ifPresent(approvalDocument -> {
            LocalDateTime now = LocalDateTime.now();
            approvalDocument.setDeletedAt(now);

            // 삭제자 정보 설정 (WeeklyReport의 updatedUserIdx 또는 userIdx 사용)
            Long deletedUserIdx = report.getUpdatedUserIdx() != null ?
                report.getUpdatedUserIdx() : report.getUserIdx();
            approvalDocument.setDeletedUserIdx(deletedUserIdx);

            approvalDocumentRepository.save(approvalDocument);
            log.debug("ApprovalDocument soft deleted - documentIdx: {}, deletedAt: {}, deletedUserIdx: {}",
                documentIdx, now, deletedUserIdx);
        });

        // WeeklyReport는 실제 삭제 (hard delete)
        weeklyReportRepository.deleteById(report.getId());
        log.debug("WeeklyReport deleted successfully - id: {}, documentIdx: {}", report.getId(), documentIdx);
    }

    /**
     * 프로젝트 주간업무보고 PDF 생성 및 저장
     *
     * @param createDTO       생성 요청 DTO (렌더링된 HTML/CSS 포함)
     * @param saved           저장된 WeeklyReport 엔티티
     * @param savedDocument   저장된 ApprovalDocument 엔티티
     */
    private void generateAndSaveWeeklyReportPdf(WeeklyReportCreateDTO createDTO,
                                                 WeeklyReport saved,
                                                 ApprovalDocument savedDocument) {
        try {
            // 프론트엔드에서 렌더링된 HTML과 CSS가 있는 경우에만 PDF 생성
            if (createDTO.getRenderedHtml() != null && !createDTO.getRenderedHtml().isEmpty()) {
                String renderedHtml = createDTO.getRenderedHtml();
                String renderedCss = createDTO.getRenderedCss() != null ? createDTO.getRenderedCss() : "";

                log.info("[프로젝트 주간업무보고 PDF 생성] documentIdx: {}, weeklyReportId: {}",
                         savedDocument.getIdx(), saved.getId());

                // 완전한 HTML 문서 생성 (CSS 인라인 포함)
                String fullHtml = "<!DOCTYPE html>\n" +
                        "<html lang=\"ko\">\n" +
                        "<head>\n" +
                        "    <meta charset=\"UTF-8\">\n" +
                        "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                        "    <title>프로젝트 주간업무보고</title>\n" +
                        "    <style>\n" +
                        "        * { margin: 0; padding: 0; box-sizing: border-box; }\n" +
                        "        body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 11px; line-height: 1.5; padding: 20px; }\n" +
                        renderedCss + "\n" +
                        "    </style>\n" +
                        "</head>\n" +
                        "<body>\n" +
                        renderedHtml +
                        "</body>\n" +
                        "</html>";

                // PDF 생성: Playwright로 HTML을 PDF로 변환
                byte[] pdfBytes = pdfGenerationService.generatePdfFromRenderedHtml(fullHtml);

                // 파일명 생성 (보고기간 시작일 + 프로젝트명)
                String year = String.valueOf(LocalDateTime.now().getYear());
                String projectIdx = saved.getProjectIdx() != null ? saved.getProjectIdx().toString() : "0";
                String reportPeriod = saved.getReportPeriod() != null ?
                    saved.getReportPeriod().replaceAll("[^0-9]", "").substring(0, 8) :
                    LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
                String fileName = String.format("%s_weekly_report_project_%s.pdf", reportPeriod, projectIdx);

                // PDF 서버에 저장 (경로: project/{year}/{projectIdx})
                String savePath = pdfGenerationService.saveWeeklyReportPdf(pdfBytes, fileName, year, projectIdx);
                log.info("[PDF 저장 완료] path: {}", savePath);

                // DB에 PDF 파일 정보 저장
                com.pinecni.erp.entity.WeeklyReportOfficialPdf officialPdf = com.pinecni.erp.entity.WeeklyReportOfficialPdf.builder()
                        .documentIdx(savedDocument.getIdx())
                        .filePath(savePath)
                        .fileName(fileName)
                        .fileSize((long) pdfBytes.length)
                        .createdUserIdx(createDTO.getUserIdx())
                        .build();

                weeklyReportOfficialPdfRepository.save(officialPdf);
                log.info("[PDF 파일 정보 DB 저장 완료] fileIdx: {}, documentIdx: {}",
                         officialPdf.getIdx(), savedDocument.getIdx());

            } else {
                log.warn("[PDF 생성 스킵] renderedHtml이 비어있음 - documentIdx: {}", savedDocument.getIdx());
            }

        } catch (Exception e) {
            log.error("[PDF 생성 실패] documentIdx: {}, error: {}", savedDocument.getIdx(), e.getMessage(), e);
            // PDF 생성 실패는 전체 트랜잭션을 롤백하지 않음 (주간보고는 유지)
        }
    }

}
