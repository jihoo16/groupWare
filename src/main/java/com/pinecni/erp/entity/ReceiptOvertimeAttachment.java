package com.pinecni.erp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "receipt_overtime_attachment", schema = "erp")
public class ReceiptOvertimeAttachment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idx", nullable = false)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "receipt_overtime_idx", nullable = false)
    private ReceiptOvertime receiptOvertimeIdx;

    @Size(max = 255)
    @NotNull
    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    @Size(max = 255)
    @NotNull
    @Column(name = "saving_filename", nullable = false)
    private String savingFilename;

    @Size(max = 500)
    @NotNull
    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @NotNull
    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Size(max = 100)
    @Column(name = "file_type", length = 100)
    private String fileType;

    @NotNull
    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @NotNull
    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

}