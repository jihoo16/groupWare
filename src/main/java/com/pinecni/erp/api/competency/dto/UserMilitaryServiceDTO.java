package com.pinecni.erp.api.competency.dto;

import com.pinecni.erp.constant.CodeConstants.MilitaryStatus;
import com.pinecni.erp.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 병적사항 입출력 DTO
 *
 * - militaryStatus: 코드값 (C1201 ~ C1205)
 * - militaryStatusLabel: 응답용 한글 라벨 (서버에서 매핑, 요청 시에는 무시됨)
 * - militaryEnlistDate / militaryDischargeDate: 부분 입력 허용 (YYYY / YYYY-MM / YYYY-MM-DD)
 * - militaryNotes: 자유 입력 비고 (군 종류 등)
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserMilitaryServiceDTO {

    private String militaryStatus;
    private String militaryStatusLabel;
    private String militaryEnlistDate;
    private String militaryDischargeDate;
    private String militaryNotes;

    public static UserMilitaryServiceDTO from(User user) {
        MilitaryStatus status = MilitaryStatus.fromCodeOrNull(user.getMilitaryStatus());
        return UserMilitaryServiceDTO.builder()
                .militaryStatus(user.getMilitaryStatus())
                .militaryStatusLabel(status != null ? status.getName() : null)
                .militaryEnlistDate(user.getMilitaryEnlistDate())
                .militaryDischargeDate(user.getMilitaryDischargeDate())
                .militaryNotes(user.getMilitaryNotes())
                .build();
    }
}
