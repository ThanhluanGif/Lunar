const PLAN_CATALOG = Object.freeze({
  FREE: Object.freeze({
    id: 'FREE',
    name: 'Gói Miễn Phí',
    amount: 0,
    currency: 'VND',
    billingPeriod: 'FOREVER',
    scanLimit: 5,
    aiReviewLimit: 3,
    features: Object.freeze([
      '5 lượt quét mã nguồn mỗi ngày',
      '3 lượt AI review mỗi ngày',
      'Xem điểm CVSS và tổng quan rủi ro',
      'Tham gia cộng đồng bảo mật'
    ])
  }),
  PRO: Object.freeze({
    id: 'PRO',
    name: 'Gói Chuyên Nghiệp',
    amount: 290000,
    currency: 'VND',
    billingPeriod: 'MONTH',
    scanLimit: null,
    aiReviewLimit: 50,
    popular: true,
    features: Object.freeze([
      'Không giới hạn lượt quét mã nguồn',
      '50 lượt AI review mỗi ngày',
      'Chi tiết finding và AI Code Repair Workbench',
      'Xuất báo cáo PDF và gửi qua Gmail'
    ])
  }),
  ENTERPRISE: Object.freeze({
    id: 'ENTERPRISE',
    name: 'Gói Enterprise Git Bot',
    amount: 1500000,
    currency: 'VND',
    billingPeriod: 'MONTH',
    scanLimit: null,
    aiReviewLimit: null,
    features: Object.freeze([
      'Tất cả tính năng của gói Pro',
      'AI review không giới hạn',
      'GitHub Security Bot và webhook',
      'Hỗ trợ ưu tiên'
    ])
  })
});

function getPlan(planId) {
  return PLAN_CATALOG[String(planId || '').trim().toUpperCase()] || null;
}

function listPublicPlans() {
  return Object.values(PLAN_CATALOG).map((plan) => ({
    ...plan,
    features: [...plan.features]
  }));
}

module.exports = {
  getPlan,
  listPublicPlans
};
