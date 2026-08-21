import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';

export const DCB_EXPOSE_INBOUND_CALL_TYPES = {
  pincode: ApiCallType.DCB_EXPOSE_PINCODE_IN,
  confirm: ApiCallType.DCB_EXPOSE_CONFIRM_IN,
  status: ApiCallType.DCB_EXPOSE_STATUS_IN,
};

export const DCB_EXPOSE_INBOUND_EVENT_TYPES = {
  pincode: VisitEventType.OTP_SEND,
  confirm: VisitEventType.OTP_VERIFY,
  status: null,
};

/** Vendor DCB expose: one visit per pincode attempt. Confirm uses requestId. No click_id. */
export const DCB_EXPOSE_VISIT_POLICY = {
  reuseVisitByMsisdn: false,
  mintClickId: false,
  confirmUsesPincodeVisit: true,
};

export function serializeDcbExposeInboundBody(input = {}) {
  return JSON.stringify({
    msisdn: input.msisdn || input.phone || null,
    purchaseTypeId: input.purchaseTypeId || null,
    transactionChannel: input.transactionChannel || null,
    serviceId: input.serviceId || null,
    requestId: input.requestId || input.request_id || null,
    pin: input.pin || input.pincode || input.pinCode || null,
    vendorId: input.vendorId || null,
    campaignId: input.campaignId || null,
  });
}
