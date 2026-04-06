package com.pinecni.erp.api.project.controller;

import com.pinecni.erp.api.project.dto.ProjectCardDTO;
import com.pinecni.erp.api.project.service.ProjectCardService;
import com.pinecni.erp.util.AuthorizationUtil;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 연구비카드 REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/project-cards")
@RequiredArgsConstructor
public class ProjectCardController {

    private final ProjectCardService projectCardService;

    /** 관리자 권한 검증 */
    private void requireAdmin(HttpSession session) {
        if (!AuthorizationUtil.isAdminOrHigher(session)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자 권한이 필요합니다.");
        }
    }

    /**
     * 전체 연구비카드 목록 조회
     * GET /api/project-cards
     * GET /api/project-cards?cardCompany=신한카드
     */
    @GetMapping
    public ResponseEntity<List<ProjectCardDTO>> getAllCards(
            @RequestParam(required = false) String cardCompany) {
        log.debug("GET /api/project-cards - cardCompany: {}", cardCompany);

        try {
            List<ProjectCardDTO> cards;
            if (cardCompany != null && !cardCompany.isEmpty()) {
                cards = projectCardService.getCardsByCompany(cardCompany);
            } else {
                cards = projectCardService.getAllCards();
            }
            return ResponseEntity.ok(cards);
        } catch (Exception e) {
            log.error("연구비카드 목록 조회 실패: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    /**
     * 연구비카드 상세 조회
     * GET /api/project-cards/{idx}
     */
    @GetMapping("/{idx}")
    public ResponseEntity<?> getCard(@PathVariable Long idx) {
        log.debug("GET /api/project-cards/{}", idx);

        try {
            ProjectCardDTO card = projectCardService.getCardById(idx);
            return ResponseEntity.ok(card);
        } catch (IllegalArgumentException e) {
            log.warn("연구비카드 조회 실패 - idx: {}, error: {}", idx, e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            log.error("연구비카드 조회 오류: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "연구비카드 조회에 실패했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 연구비카드 등록
     * POST /api/project-cards
     */
    @PostMapping
    public ResponseEntity<?> createCard(@RequestBody ProjectCardDTO cardDTO, HttpSession session) {
        requireAdmin(session);
        log.debug("POST /api/project-cards - projectIdx: {}, cardCompany: {}",
                cardDTO.getProjectIdx(), cardDTO.getCardCompany());

        try {
            ProjectCardDTO created = projectCardService.createCard(cardDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            log.warn("연구비카드 등록 실패: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (Exception e) {
            log.error("연구비카드 등록 오류: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "연구비카드 등록에 실패했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 연구비카드 수정
     * PUT /api/project-cards/{idx}
     */
    @PutMapping("/{idx}")
    public ResponseEntity<?> updateCard(@PathVariable Long idx, @RequestBody ProjectCardDTO cardDTO, HttpSession session) {
        requireAdmin(session);
        log.debug("PUT /api/project-cards/{}", idx);

        try {
            ProjectCardDTO updated = projectCardService.updateCard(idx, cardDTO);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            log.warn("연구비카드 수정 실패 - idx: {}, error: {}", idx, e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            log.error("연구비카드 수정 오류: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "연구비카드 수정에 실패했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 연구비카드 삭제 (비활성화)
     * DELETE /api/project-cards/{idx}
     */
    @DeleteMapping("/{idx}")
    public ResponseEntity<?> deleteCard(@PathVariable Long idx, HttpSession session) {
        requireAdmin(session);
        log.debug("DELETE /api/project-cards/{}", idx);

        try {
            projectCardService.deleteCard(idx);
            Map<String, String> response = new HashMap<>();
            response.put("message", "연구비카드가 삭제되었습니다.");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("연구비카드 삭제 실패 - idx: {}, error: {}", idx, e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            log.error("연구비카드 삭제 오류: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "연구비카드 삭제에 실패했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}
