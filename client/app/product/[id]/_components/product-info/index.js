"use client";
import React from "react";
import styles from "./product-info.module.scss";

export default function ProductInfo({ product }) {
  return (
    <div className={`${styles.productInfo}`}>
      <p className={styles.brand}>{product.brand_name}</p>
      <h1 className={styles.productTitle}>{product.name}</h1>
      <p className={styles.introduce}>{product.short_introduce}</p><br />
      <p className={styles.price}>NT$ {product.price.toLocaleString()}</p>

      {/* 按鈕區域 */}
      <div className="d-flex">
        <button className={`btn btn-primary me-2 ${styles.cartButton}`}>+加入購物車</button>
      </div>
    </div>
  );
}
