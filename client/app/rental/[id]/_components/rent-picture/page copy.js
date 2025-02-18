'use client'

import { useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'

// 預設 6 張圖片（當 API 沒有圖片時使用）
const defaultImages = [
  '/images/rental/test/leica-Q3-0.png',
  '/images/rental/test/leica-Q3-1.png',
  '/images/rental/test/leica-Q3-2.png',
  '/images/rental/test/leica-Q3-3.png',
  '/images/rental/test/leica-Q3-4.png',
  '/images/rental/test/leica-Q3-5.png',
]

export default function RentPicture({ images = [] }) {
  // 如果 API 沒有圖片，則使用預設圖片
  const finalImages =
    images.length > 0
      ? images.map((img) => `/images/rental/${img}.png`)
      : defaultImages

  // 設定主圖（預設為第一張）
  const [mainImage, setMainImage] = useState(finalImages[0])

  // 計算需要補齊的空白區塊數量，確保圖片真的小於 3 張才補足
  const missingImages = images.length < 3 ? 3 - images.length : 0

  // 處理點擊縮圖切換主圖
  const handleThumbnailClick = (image) => {
    setMainImage(image)
  }

  return (
    <div>
      {/* 主圖顯示區域 */}
      <div className="text-center p-card2">
        <img
          src={mainImage}
          alt="Product Image"
          className="product-image img-fluid"
        />
      </div>

      {/* 縮圖輪播區域 */}
      <div className="thumbnails-container mt-3 d-flex align-items-center position-relative">
        <Swiper spaceBetween={10} slidesPerView={3}>
          {finalImages.map((img, index) => (
            <SwiperSlide key={index}>
              {/* 縮圖，點擊後切換主圖 */}
              <div
                className="thumbnail p-card2"
                onClick={() => handleThumbnailClick(img)}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${index}`}
                  className={`img-fluid ${mainImage === img ? 'active' : ''}`}
                />
              </div>
            </SwiperSlide>
          ))}
          {/* 使用 CSS 偽元素補足空白，確保只有當圖片少於 3 張時才補齊 */}
          {missingImages > 0 &&
            Array(missingImages)
              .fill(null)
              .map((_, index) => (
                <SwiperSlide key={`empty-${index}`} className="empty-slide">
                  <div
                    className="thumbnail p-card2 placeholder-slide"
                    aria-hidden="true"
                  ></div>
                </SwiperSlide>
              ))}
        </Swiper>
      </div>
    </div>
  )
}
