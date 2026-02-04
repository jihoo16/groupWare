package com.pinecni.erp.api.document.mapper;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.document.dto.*;
import com.pinecni.erp.api.externalperson.repository.ExternalPersonRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.constant.CodeConstants;
import com.pinecni.erp.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * ReceiptTrip Entity ↔ DTO 변환 Mapper
 */
@Component
@RequiredArgsConstructor
public class ReceiptTripMapper {

    private final UserRepository userRepository;
    private final CodeRepository codeRepository;
    private final ExternalPersonRepository externalPersonRepository;

    /**
     * Entity → DTO 변환
     */
    public ReceiptTripDTO toDTO(ReceiptTrip entity) {
        if (entity == null) {
            return null;
        }

        // 작성자 정보 조회
        User author = userRepository.findById(entity.getAuthorIdx()).orElse(null);
        String authorUserName = null;
        String authorDept = null;
        String authorDeptName = null;

        if (author != null) {
            authorUserName = author.getEmpName();
            if (author.getEmpDept() != null) {
                authorDept = author.getEmpDept();
                authorDeptName = codeRepository.findByGroupCodeAndCode(CodeConstants.GroupCode.DEPARTMENT.getCode(), author.getEmpDept())
                        .map(Code::getCodeName)
                        .orElse(null);
            }
        }

        // 참석자 목록 변환
        List<ReceiptTripAttendeeDTO> attendeeDTOs = entity.getAttendees() != null ?
                entity.getAttendees().stream()
                        .map(this::toAttendeeDTO)
                        .collect(Collectors.toList()) : null;

        return ReceiptTripDTO.builder()
                .idx(entity.getIdx())
                .projectIdx(entity.getProjectIdx())
                .projectName(entity.getProject() != null ? entity.getProject().getProjectName() : null)
                .documentNumber(entity.getDocumentNumber())
                .authorIdx(entity.getAuthorIdx())
                .authorUserName(authorUserName)
                .authorDept(authorDept)
                .authorDeptName(authorDeptName)
                .tripDate(entity.getTripDate())
                .location(entity.getLocation())
                .transportationFee(entity.getTransportationFee())
                .accommodationFee(entity.getAccommodationFee())
                .mealFee(entity.getMealFee())
                .otherFee(entity.getOtherFee())
                .purpose(entity.getPurpose())
                .content(entity.getContent())
                .paymentMethod(entity.getPaymentMethod())
                .status(entity.getStatus())
                .attendees(attendeeDTOs)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    /**
     * CreateDTO → Entity 변환
     */
    public ReceiptTrip toEntity(ReceiptTripCreateDTO dto) {
        if (dto == null) {
            return null;
        }

        return ReceiptTrip.builder()
                .projectIdx(dto.getProjectIdx())
                .authorIdx(dto.getAuthorIdx())
                .tripDate(dto.getTripDate())
                .location(dto.getLocation())
                .transportationFee(dto.getTransportationFee())
                .accommodationFee(dto.getAccommodationFee())
                .mealFee(dto.getMealFee())
                .otherFee(dto.getOtherFee())
                .purpose(dto.getPurpose())
                .content(dto.getContent())
                .paymentMethod(dto.getPaymentMethod())
                .status("PENDING")
                .build();
    }

    /**
     * UpdateDTO로 Entity 업데이트
     */
    public void updateEntity(ReceiptTrip entity, ReceiptTripUpdateDTO dto) {
        if (entity == null || dto == null) {
            return;
        }

        if (dto.getProjectIdx() != null) {
            entity.setProjectIdx(dto.getProjectIdx());
        }
        if (dto.getTripDate() != null) {
            entity.setTripDate(dto.getTripDate());
        }
        if (dto.getLocation() != null) {
            entity.setLocation(dto.getLocation());
        }
        if (dto.getTransportationFee() != null) {
            entity.setTransportationFee(dto.getTransportationFee());
        }
        if (dto.getAccommodationFee() != null) {
            entity.setAccommodationFee(dto.getAccommodationFee());
        }
        if (dto.getMealFee() != null) {
            entity.setMealFee(dto.getMealFee());
        }
        if (dto.getOtherFee() != null) {
            entity.setOtherFee(dto.getOtherFee());
        }
        if (dto.getPurpose() != null) {
            entity.setPurpose(dto.getPurpose());
        }
        if (dto.getContent() != null) {
            entity.setContent(dto.getContent());
        }
        if (dto.getPaymentMethod() != null) {
            entity.setPaymentMethod(dto.getPaymentMethod());
        }
    }

    /**
     * ReceiptTripAttendee Entity → DTO 변환
     */
    public ReceiptTripAttendeeDTO toAttendeeDTO(ReceiptTripAttendee entity) {
        if (entity == null) {
            return null;
        }
        String position = null;

        // attendee_type에 따라 직책 조회
        if ("내부".equals(entity.getAttendeeType()) && entity.getUserIdx() != null) {
            // 내부 참석자: User에서 직급명 조회
            position = userRepository.findById(entity.getUserIdx())
                    .map(user -> {
                        if (user.getEmpPosition() != null) {
                            return codeRepository.findByGroupCodeAndCode(CodeConstants.GroupCode.POSITION.getCode(), user.getEmpPosition())
                                    .map(Code::getCodeName)
                                    .orElse(null);
                        }
                        return null;
                    })
                    .orElse(null);
        } else if ("외부".equals(entity.getAttendeeType()) && entity.getUserIdx() != null) {
            // 외부 참석자: ExternalPerson에서 직책 조회
            position = externalPersonRepository.findById(entity.getUserIdx())
                    .map(ExternalPerson::getPosition)
                    .orElse(null);
        }

        return ReceiptTripAttendeeDTO.builder()
                .idx(entity.getIdx())
                .attendeeType(entity.getAttendeeType())
                .department(entity.getDepartment())
                .name(entity.getName())
                .userIdx(entity.getUserIdx())
                .position(position)
                .displayOrder(entity.getDisplayOrder())
                .build();
    }

    /**
     * ReceiptTripAttendeeDTO → Entity 변환
     */
    public ReceiptTripAttendee toAttendeeEntity(ReceiptTripAttendeeDTO dto, Long receiptTripIdx) {
        if (dto == null) {
            return null;
        }

        return ReceiptTripAttendee.builder()
                .receiptTripIdx(receiptTripIdx)
                .attendeeType(dto.getAttendeeType())
                .department(dto.getDepartment())
                .name(dto.getName())
                .userIdx(dto.getUserIdx())
                .displayOrder(dto.getDisplayOrder())
                .build();
    }
}
