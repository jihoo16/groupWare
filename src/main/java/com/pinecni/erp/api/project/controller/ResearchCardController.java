package com.pinecni.erp.api.project.controller;

import com.pinecni.erp.api.project.dto.ResearchCardDTO;
import com.pinecni.erp.api.project.service.ResearchCardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 연구비 카드 REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/research-cards")
@RequiredArgsConstructor
public class ResearchCardController {

    private final ResearchCardService researchCardService;

    /**
     * 전체 연구비 카드 목록 조회
     * GET /api/research-cards
     * GET /api/research-cards?cardCompany=신한카드
     */
    @GetMapping
    public ResponseEntity<List<ResearchCardDTO>> getAllCards(
            @RequestParam(required = false) String cardCompany) {
        log.debug("GET /api/research-cards - cardCompany: {}", cardCompany);

        try {
            List<ResearchCardDTO> cards;
            if (cardCompany != null && !cardCompany.isEmpty()) {
                cards = researchCardService.getCardsByCompany(cardCompany);
            } else {
                cards = researchCardService.getAllCards();
            }
            return ResponseEntity.ok(cards);
        } catch (Exception e) {
            log.error("연구비 카드 목록 조회 실패: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    /**
     * 연구비 카드 상세 조회
     * GET /api/research-cards/{idx}
     */
    @GetMapping("/{idx}")
    public ResponseEntity<?> getCard(@PathVariable Long idx) {
        log.debug("GET /api/research-cards/{}", idx);

        try {
            ResearchCardDTO card = researchCardService.getCardById(idx);
            return ResponseEntity.ok(card);
        } catch (IllegalArgumentException e) {
            log.warn("연구비 카드 조회 실패 - idx: {}, error: {}", idx, e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            log.error("연구비 카드 조회 오류: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "연구비 카드 조회에 실패했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 연구비 카드 등록
     * POST /api/research-cards
     */
    @PostMapping
    public ResponseEntity<?> createCard(@RequestBody ResearchCardDTO cardDTO) {
        log.debug("POST /api/research-cards - projectIdx: {}, cardCompany: {}",
                cardDTO.getProjectIdx(), cardDTO.getCardCompany());

        try {
            ResearchCardDTO created = researchCardService.createCard(cardDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            log.warn("연구비 카드 등록 실패: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (Exception e) {
            log.error("연구비 카드 등록 오류: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "연구비 카드 등록에 실패했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 연구비 카드 수정
     * PUT /api/research-cards/{idx}
     */
    @PutMapping("/{idx}")
    public ResponseEntity<?> updateCard(@PathVariable Long idx, @RequestBody ResearchCardDTO cardDTO) {
        log.debug("PUT /api/research-cards/{}", idx);

        try {
            ResearchCardDTO updated = researchCardService.updateCard(idx, cardDTO);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            log.warn("연구비 카드 수정 실패 - idx: {}, error: {}", idx, e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            log.error("연구비 카드 수정 오류: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "연구비 카드 수정에 실패했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 연구비 카드 삭제 (비활성화)
     * DELETE /api/research-cards/{idx}
     */
    @DeleteMapping("/{idx}")
    public ResponseEntity<?> deleteCard(@PathVariable Long idx) {
        log.debug("DELETE /api/research-cards/{}", idx);

        try {
            researchCardService.deleteCard(idx);
            Map<String, String> response = new HashMap<>();
            response.put("message", "연구비 카드가 삭제되었습니다.");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("연구비 카드 삭제 실패 - idx: {}, error: {}", idx, e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            log.error("연구비 카드 삭제 오류: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "연구비 카드 삭제에 실패했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}
