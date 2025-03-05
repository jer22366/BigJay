import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { articleId } = body;

    // 將請求轉發到 Express 後端
    const response = await fetch('http://localhost:8000/api/product/update-product-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ articleId }),
    });

    if (!response.ok) {
      throw new Error(`Express API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API 路由處理錯誤:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}