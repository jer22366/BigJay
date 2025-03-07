'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './index.module.scss';
import StarRating from '@/app/courses/_components/star-rating/page.js';
import AOS from 'aos';
import 'aos/dist/aos.css';

// 從資料庫取得推薦課程
function ProductCard({ course }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const safeImage = course.image_url || '/images/default-course.jpg';

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      offset: 100,
    });
  }, []);

  return (
    <div className="col-lg-3 col-sm-6 col-12" data-aos="fade-up">
      <Link href={`/courses/${course.id}`} className={styles['course-card-link']}>
        <div className={`${styles['course-card']} mb-md-5 mb-4`}>
          <div className={styles['card-img']} data-aos="fade-in">
            <img
              src={safeImage}
              alt={course.title}
              className="img-fluid"
              loading="lazy"
            />
            <div className={styles['img-overlay']}></div>
            <button
              className={styles['favorite-icon']}
              onClick={(e) => {
                e.preventDefault();
                setIsFavorite(!isFavorite);
              }}
            >
              <img
                src={isFavorite ? "/images/icon/heart-filled.svg" : "/images/article/heart-dark.svg"}
                alt="收藏"
              />
            </button>
          </div>
          <div className="card-body p-0 mt-3">
            <h6 className={styles['teacher-name']}>{course.teacher_name}</h6>
            <h5 className={styles['course-title']}>{course.title}</h5>
            <div className={styles['rating-student']}>
              <div className={styles['rating']}>
                <p>{parseFloat(course.rating || 0).toFixed(1)}</p>
                <StarRating rating={course.rating || 0} />
              </div>
              <div className={styles['student-count']}>
                <img src="/images/icon/student-count.svg" alt="學生數量" />
                <div className={styles['student-num']}>
                  {course.student_count ? course.student_count.toLocaleString('en-US') : '0'}
                </div>
              </div>
            </div>
            <h6 className={styles['course-price']}>
              <p>NT$ {course.sale_price ? course.sale_price.toLocaleString('en-US') : 'N/A'}</p>
            </h6>
          </div>
        </div>
      </Link>
    </div>
  );
}

// 主元件
export default function Recommends() {
  const [recommendCourses, setRecommendCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRecommendCourses = async () => {
    try {
      console.log('正在獲取推薦課程...');
      const response = await fetch('/api/courses/recommend');
      console.log('推薦課程 API 響應狀態:', response.status);
      
      if (!response.ok) {
        console.warn(`API 返回錯誤: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      console.log('獲取到的課程數據:', data ? data.length : 'none');
      return data || [];
    } catch (error) {
      console.error('獲取推薦課程失敗:', error);
      return []; // 出錯時返回空數組
    }
  };

  useEffect(() => {
    const loadCourses = async () => {
      setLoading(true);
      try {
        const courses = await fetchRecommendCourses();
        setRecommendCourses(courses);
      } catch (error) {
        console.error('載入推薦課程時出錯:', error);
        setRecommendCourses([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadCourses();
  }, []);

  return (
    <div className={styles['y-recommends-area-bg']}>
      <div className={`my-5 ${styles['y-recommends-area']}`}>
        <h2 className="px-4">Lenstudio Recommends</h2>
        <div className={styles['y-recommends-line']}></div>
        <div className="row px-4">
          {recommendCourses.map((course) => (
            <ProductCard key={course.id} course={course} />
          ))}
        </div>
      </div>
    </div>
  );
}