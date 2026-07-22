export const INITIAL_PROJECTS = [
  {
    id: 'proj-1',
    title: 'VietStock AI Screener',
    githubUrl: 'https://github.com/hoangviet-dev/vietstock-ai-screener',
    author: {
      name: 'Hoàng Việt',
      username: 'hoangviet-dev',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      badge: 'Senior Fullstack',
      karma: 1420
    },
    stars: 184,
    forks: 32,
    language: 'Python',
    category: 'AI / Data Science',
    description: 'Hệ thống tự động phân tích kỹ thuật và quét cổ phiếu chứng khoán Việt Nam sử dụng FastAPI + PyTorch LLM.',
    submittedAt: '2 giờ trước',
    overallScore: 89,
    scores: {
      naming: 92,
      architecture: 88,
      performance: 85,
      security: 90,
      readability: 90
    },
    aiSummary: 'Dự án có cấu trúc mã nguồn sạch sẽ, áp dụng rất tốt mô hình Service-Repository Pattern. Các hàm xử lý bất đồng bộ (async await) được tối ưu tốt cho I/O bound tasks.',
    files: [
      {
        path: 'src/screener/engine.py',
        language: 'python',
        content: `import asyncio
import numpy as np
from typing import List, Dict, Optional
from dataclasses import dataclass
from src.core.logger import get_logger

logger = get_logger(__name__)

@dataclass
class StockSignal:
    symbol: str
    rsi_14: float
    macd_divergence: bool
    ai_confidence_score: float

class StockScreenerEngine:
    def __init__(self, data_provider, ai_model):
        self.data_provider = data_provider
        self.ai_model = ai_model

    async def scan_market(self, symbols: List[str]) -> List[StockSignal]:
        """Quét toàn bộ thị trường bất đồng bộ để lọc cổ phiếu tiềm năng"""
        logger.info(f"Bắt đầu quét {len(symbols)} mã cổ phiếu...")
        tasks = [self._process_symbol(sym) for sym in symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        signals = []
        for res in results:
            if isinstance(res, StockSignal) and res.ai_confidence_score > 0.75:
                signals.append(res)
            elif isinstance(res, Exception):
                logger.error(f"Lỗi khi tính toán mã: {res}")
                
        return sorted(signals, key=lambda s: s.ai_confidence_score, reverse=True)

    async def _process_symbol(self, symbol: str) -> Optional[StockSignal]:
        df = await self.data_provider.fetch_ohlcv(symbol, limit=100)
        if df.empty or len(df) < 30:
            return None
            
        rsi = self._calculate_rsi(df['close'].values)
        macd, signal_line = self._calculate_macd(df['close'].values)
        ai_score = await self.ai_model.predict_trend(df)
        
        return StockSignal(
            symbol=symbol,
            rsi_14=float(rsi[-1]),
            macd_divergence=bool(macd[-1] > signal_line[-1]),
            ai_confidence_score=float(ai_score)
        )`,
        annotations: [
          {
            line: 25,
            type: 'performance',
            title: 'Tối ưu hóa asyncio.gather',
            message: 'Nên dùng `asyncio.Semaphore` để giới hạn số lượng request đồng thời khi quét >1000 mã, tránh bị Rate Limit HTTP API.',
            suggestion: 'semaphore = asyncio.Semaphore(20)\nasync with semaphore:\n    # execute task'
          },
          {
            line: 12,
            type: 'naming',
            title: 'Đặt tên Type Hints hoàn hảo',
            message: 'Sử dụng Dataclass và Type Hints rất rõ ràng, chuẩn PEP 8.'
          }
        ]
      },
      {
        path: 'src/core/security.py',
        language: 'python',
        content: `import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer

security_scheme = HTTPBearer()

SECRET_KEY = "VN_STOCK_AI_SECRET_KEY_CHANGE_ME_IN_PROD"  # WARNING

def verify_token(credentials = Security(security_scheme)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc đã hết hạn")`,
        annotations: [
          {
            line: 8,
            type: 'security',
            title: 'Cảnh báo Bảo mật: Hardcoded Secret Key',
            message: 'Không bao giờ để SECRET_KEY trực tiếp trong file code. Hãy chuyển sang đọc từ biến môi trường `os.getenv("SECRET_KEY")`.',
            suggestion: 'import os\nSECRET_KEY = os.getenv("SECRET_KEY")\nif not SECRET_KEY:\n    raise ValueError("SECRET_KEY environment variable missing!")'
          }
        ]
      }
    ],
    communityReviews: [
      {
        id: 'rev-1',
        author: 'Nguyễn Anh Tuấn',
        role: 'Tech Lead @ VNG',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        score: 92,
        badge: 'Clean Architect',
        comment: 'Code rất đẹp và súc tích! Nhất là việc áp dụng Dataclass cho StockSignal. Mình khuyến nghị dùng `pydantic.BaseModel` thay cho `dataclass` nếu làm việc với FastAPI để tận dụng auto validation.',
        createdAt: '1 giờ trước',
        likes: 24
      },
      {
        id: 'rev-2',
        author: 'Phạm Minh Trang',
        role: 'Senior DevOps',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
        score: 85,
        badge: 'Bug Hunter',
        comment: 'Cần chú ý lại việc hardcode SECRET_KEY ở file security.py nhé bro. Còn lại tổng thể kiến trúc quá tuyệt vời để cho vào Portfolio!',
        createdAt: '30 phút trước',
        likes: 15
      }
    ]
  },
  {
    id: 'proj-2',
    title: 'FastAPI Ecommerce Microservice',
    githubUrl: 'https://github.com/dinhthang-dev/fastapi-ecommerce',
    author: {
      name: 'Định Thắng',
      username: 'dinhthang-dev',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      badge: 'Backend Specialist',
      karma: 980
    },
    stars: 126,
    forks: 18,
    language: 'TypeScript',
    category: 'Web App',
    description: 'Hệ thống thương mại điện tử phân tán với Event-driven architecture bằng RabbitMQ, Redis Caching và NestJS microservices.',
    submittedAt: '5 giờ trước',
    overallScore: 84,
    scores: {
      naming: 86,
      architecture: 92,
      performance: 88,
      security: 76,
      readability: 78
    },
    aiSummary: 'Kiến trúc Event-driven được thiết kế rất chuẩn mực. Tuy nhiên một số hàm xử lý DB query chưa được index phù hợp và thiếu validate dữ liệu đầu vào.',
    files: [
      {
        path: 'apps/order-service/src/order.controller.ts',
        language: 'typescript',
        content: `import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async checkoutOrder(@Body() dto: CreateOrderDto, @Req() req: any) {
    const userId = req.user?.id || 'ANONYMOUS';
    return await this.orderService.processCheckout(userId, dto);
  }
}`,
        annotations: [
          {
            line: 10,
            type: 'security',
            title: 'Chưa kiểm tra Authentication Guard',
            message: 'Endpoint checkoutOrder thiếu `@UseGuards(JwtAuthGuard)`. Việc fallback về "ANONYMOUS" có thể tạo lỗ hổng cho phép tạo đơn hàng ảo mà không đăng nhập.',
            suggestion: '@Post()\n@UseGuards(JwtAuthGuard)\nasync checkoutOrder(@Body() dto: CreateOrderDto, @Req() req: RequestWithUser) {'
          }
        ]
      }
    ],
    communityReviews: [
      {
        id: 'rev-3',
        author: 'Lê Bảo',
        role: 'Fullstack Dev',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
        score: 84,
        badge: 'System Design',
        comment: 'Phần chia Microservice của bạn cực kỳ trực quan. NestJS + Event Pattern là combo quá đỉnh!',
        createdAt: '3 giờ trước',
        likes: 12
      }
    ]
  },
  {
    id: 'proj-3',
    title: 'Go High-Performance Gateway',
    githubUrl: 'https://github.com/trungkhang/go-highperf-gateway',
    author: {
      name: 'Trần Trung Khang',
      username: 'trungkhang',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
      badge: 'Go Core Dev',
      karma: 2150
    },
    stars: 310,
    forks: 54,
    language: 'Go',
    category: 'System / Infrastructure',
    description: 'API Gateway siêu nhẹ viết bằng Golang hỗ trợ Dynamic Rate Limiting dựa trên Token Bucket và Redis cluster.',
    submittedAt: '1 ngày trước',
    overallScore: 94,
    scores: {
      naming: 95,
      architecture: 96,
      performance: 98,
      security: 90,
      readability: 91
    },
    aiSummary: 'Dự án đạt chuẩn Production-ready xuất sắc. Tốc độ phản hồi cực nhanh dưới 2ms, zero memory allocation ở đường dẫn hot-path.',
    files: [
      {
        path: 'gateway/ratelimit.go',
        language: 'go',
        content: `package gateway

import (
	"context"
	"fmt"
	"time"
	"github.com/redis/go-redis/v9"
)

type TokenBucketLimiter struct {
	client *redis.Client
	rate   int
	burst  int
}

func NewTokenBucketLimiter(client *redis.Client, rate int, burst int) *TokenBucketLimiter {
	return &TokenBucketLimiter{
		client: client,
		rate:   rate,
		burst:  burst,
	}
}

func (l *TokenBucketLimiter) Allow(ctx context.Context, key string) (bool, error) {
	now := time.Now().UnixNano()
	redisKey := fmt.Sprintf("ratelimit:%s", key)
	
	// Dùng Lua script đảm bảo tính nguyên tử (Atomicity)
	script := redis.NewScript(\`
		local key = KEYS[1]
		local capacity = tonumber(ARGV[1])
		local rate = tonumber(ARGV[2])
		local now = tonumber(ARGV[3])
		
		local last_tokens = tonumber(redis.call('hget', key, 'tokens'))
		if last_tokens == nil then
			last_tokens = capacity
		end
		
		redis.call('hset', key, 'tokens', last_tokens - 1, 'last_update', now)
		return 1
	\`)
	
	res, err := script.Run(ctx, l.client, []string{redisKey}, l.burst, l.rate, now).Int()
	if err != nil {
		return false, err
	}
	return res == 1, nil
}`,
        annotations: [
          {
            line: 25,
            type: 'architecture',
            title: 'Sử dụng Lua Script quá chuẩn!',
            message: 'Cách tiếp cận Atomic bằng Redis Lua Script chống được hoàn toàn Race Condition trong môi trường phân tán.'
          }
        ]
      }
    ],
    communityReviews: [
      {
        id: 'rev-4',
        author: 'Đỗ Tiến Đạt',
        role: 'Principal Engineer',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
        score: 95,
        badge: 'Performance Ninja',
        comment: 'Code Golang cực kỳ idiomatic. Zero allocations hot path giúp gateway đạt 50k RPS dễ dàng.',
        createdAt: '1 ngày trước',
        likes: 45
      }
    ]
  }
];
