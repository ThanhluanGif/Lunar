import { createApiUrl, normalizeApiBaseUrl } from './apiUrl';

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL, {
  requireHttps: import.meta.env.PROD
});

function apiUrl(path) {
  return createApiUrl(path, API_BASE_URL);
}

export async function fetchPublicStats() {
  try {
    const res = await fetch(apiUrl('/public/stats'), {
      credentials: 'include',
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.stats) return data.stats;
    }
  } catch (err) {
    console.warn('Unable to fetch public stats from API, using clean defaults:', err);
  }
  return {
    linesReviewed: '0',
    rawLinesReviewed: 0,
    bugsFixed: '0',
    rawBugsFixed: 0,
    avgReviewTime: '0.0 min',
    totalScans: 0,
    activeUsers: 0,
    totalProjects: 0
  };
}

export async function fetchPublicReviews() {
  try {
    const res = await fetch(apiUrl('/public/reviews'), {
      credentials: 'include',
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.reviews) return data.reviews;
    }
  } catch (err) {
    console.warn('Unable to fetch public user reviews from API, using fallback:', err);
  }
  return [
    {
      id: 'review-1',
      userName: 'Nguyễn Văn An',
      userRole: 'Lead Developer @ TechCorp',
      rating: 5,
      comment: 'Lunar đã giúp team phát hiện sớm lỗi SQL Injection nghiêm trọng trong dịch vụ thanh toán trước khi đưa lên production. Bản vá AI hoàn chỉnh chỉ mất vài phút.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'review-2',
      userName: 'Trần Thị Mai',
      userRole: 'Senior Fullstack Engineer',
      rating: 5,
      comment: 'Thời gian review tự động cực kỳ nhanh. Tích hợp GitHub giúp toàn bộ Pull Request của team mình đều được kiểm định an toàn tự động.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'review-3',
      userName: 'Lê Hoàng Nam',
      userRole: 'Security Consultant',
      rating: 5,
      comment: 'Báo cáo xuất định dạng PDF / HTML rất chuyên nghiệp với đầy đủ chỉ số CVSS và khuyến nghị theo OWASP Top 10.',
      createdAt: new Date().toISOString()
    }
  ];
}

export async function submitUserReview(reviewData) {
  try {
    const res = await fetch(apiUrl('/public/reviews'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reviewData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Lỗi gửi nhận xét.');
    }
    return data;
  } catch (err) {
    throw err;
  }
}
