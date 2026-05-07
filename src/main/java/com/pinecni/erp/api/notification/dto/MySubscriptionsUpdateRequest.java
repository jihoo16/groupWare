package com.pinecni.erp.api.notification.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class MySubscriptionsUpdateRequest {

    private List<SubscriptionDto> subscriptions;
    private QuietHoursDto         quietHours;
}
