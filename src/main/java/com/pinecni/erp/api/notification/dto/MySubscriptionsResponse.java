package com.pinecni.erp.api.notification.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class MySubscriptionsResponse {

    private final List<SubscriptionDto> subscriptions;
    private final QuietHoursDto         quietHours;
}
