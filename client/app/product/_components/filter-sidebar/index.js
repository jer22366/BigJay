"use client";

import { useState, useEffect } from "react";
import styles from "./filter-sidebar.module.scss"; // 確保 Bootstrap 樣式

export default function FilterSidebar({ onFilterChange }) {
  const [filters, setFilters] = useState({ brand: [], category: [], subcategory: [], });
  const [expanded, setExpanded] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState({
    brand_id: [],
    category_id: [],
    subcategory_id: [],
    min_price: "",
    max_price: ""
  });

  const [isMobile, setIsMobile] = useState(false); // 🔹 判斷是否為手機版
  const [isFilterVisible, setIsFilterVisible] = useState(false); // 🔹 控制側邊欄顯示
  const [isFilterButtonHidden, setIsFilterButtonHidden] = useState(false); // 🔹 控制按鈕是否隱藏

  // 🔹 檢測是否為手機版
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 390);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // 🔹 監聽滾動事件，當 `footer` 進入畫面時隱藏篩選按鈕
  useEffect(() => {
    const footer = document.getElementById("footer");

    function checkFooterVisibility() {
      if (!footer) return;
      const footerRect = footer.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      if (footerRect.top < windowHeight) {
        setIsFilterButtonHidden(true);
      } else {
        setIsFilterButtonHidden(false);
      }
    }

    if (isMobile) {
      window.addEventListener("scroll", checkFooterVisibility);
      return () => window.removeEventListener("scroll", checkFooterVisibility);
    }
  }, [isMobile]);

  // 取得篩選條件
  useEffect(() => {
    async function fetchFilters() {
      try {
        const response = await fetch("http://localhost:8000/api/product/filters");
        if (!response.ok) throw new Error("HTTP 錯誤 " + response.status);
        const data = await response.json();

        console.log("取得篩選條件:", data);
        if (!data.brand || !data.category || !data.subcategory) {
          throw new Error("API 回應格式錯誤");
        }

        setFilters(data);
      } catch (error) {
        console.error("獲取篩選條件時發生錯誤:", error);
      }
    }
    fetchFilters();
  }, []);

  // 🔹 切換展開/收合
  const toggleExpand = (section) => {
    setExpanded(expanded === section ? null : section);
  };

  // 🔹 處理 Checkbox 變更
  const handleCheckboxChange = (e) => {
    const { name, value, checked } = e.target;
    const updatedFilters = { ...selectedFilters };

    if (checked) {
      updatedFilters[name] = [...updatedFilters[name], value];
    } else {
      updatedFilters[name] = updatedFilters[name].filter((item) => item !== value);
    }

    setSelectedFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    setSelectedFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value ? Number(value) : undefined, // 只有當有值時才更新
    }));

    onFilterChange({
      ...selectedFilters,
      [name]: value ? Number(value) : undefined, // 只有當有值時才更新
    });
  };

  // 🔹 切換篩選側邊欄
  const toggleFilterSidebar = () => {
    setIsFilterVisible(!isFilterVisible);
  };


  return (
    <>
      {!isMobile && (
        <aside className={styles.asideFilter}>
          <div className="accordion" id="filterAccordion">

            <div className="accordion-item">
              <h2 className="accordion-header">
                <button
                  className={`accordion-button ${styles.accordionButton} ${expanded === "lens" ? "" : "collapsed"}`}
                  type="button"
                  onClick={() => toggleExpand("lens")}
                >
                  機身
                </button>
              </h2>
              <div className={`accordion-collapse ${expanded === "lens" ? "show" : "collapse"}`}>
                <div className="accordion-body">
                  {filters.category.length > 0 ? (
                    filters.category.map((category) => (
                      <div key={category.id} className="form-check">
                        <input
                          type="checkbox"
                          id={`category_${category.id}`}
                          name="category_id"
                          value={category.id}
                          className="form-check-input"
                          onChange={handleCheckboxChange}
                        />
                        <label htmlFor={`category_${category.id}`} className="form-check-label">
                          {category.name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p>沒有種類資料</p>
                  )}
                </div>
              </div>
            </div>

            {/* 機身 (品牌篩選) */}
            <div className="accordion-item">
              <h2 className="accordion-header">
                <button
                  className={`accordion-button ${styles.accordionButton} ${expanded === "brand" ? "" : "collapsed"}`}
                  type="button"
                  onClick={() => toggleExpand("brand")}
                >
                  品牌
                </button>
              </h2>
              <div className={`accordion-collapse ${expanded === "brand" ? "show" : "collapse"}`}>
                <div className="accordion-body">
                  {filters.brand.length > 0 ? (
                    filters.brand.map((brand) => (
                      <div key={brand.id} className="form-check">
                        <input
                          type="checkbox"
                          id={`brand_${brand.id}`}
                          name="brand_id"
                          value={brand.id}
                          className="form-check-input"
                          onChange={handleCheckboxChange}
                        />
                        <label htmlFor={`brand_${brand.id}`} className="form-check-label">
                          {brand.name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p>沒有品牌資料</p>
                  )}
                </div>
              </div>
            </div>

            {/* 種類 */}
            <div className="accordion-item">
              <h2 className="accordion-header">
                <button
                  className={`accordion-button ${styles.accordionButton} ${expanded === "subcategory" ? "" : "collapsed"}`}
                  type="button"
                  onClick={() => toggleExpand("subcategory")}
                >
                  種類
                </button>
              </h2>
              <div className={`accordion-collapse ${expanded === "subcategory" ? "show" : "collapse"}`}>
                <div className="accordion-body">
                  {filters.subcategory.length > 0 ? (
                    filters.subcategory.map((subcategory) => (
                      <div key={subcategory.id} className="form-check">
                        <input
                          type="checkbox"
                          id={`subcategory${subcategory.id}`}
                          name="subcategory_id"
                          value={subcategory.id}
                          className="form-check-input"
                          onChange={handleCheckboxChange}
                        />
                        <label htmlFor={`subcategory_${subcategory.id}`} className="form-check-label">
                          {subcategory.name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p>沒有品牌資料</p>
                  )}
                </div>
              </div>
            </div>

            {/* ✅ 價格篩選 */}
            <div className="accordion-item">
              <h2 className="accordion-header">
                <button
                  className={`accordion-button ${styles.accordionButton} ${expanded === "price" ? "" : "collapsed"}`}
                  type="button"
                  onClick={() => toggleExpand("price")}
                >
                  價格
                </button>
              </h2>
              <div className={`accordion-collapse ${expanded === "price" ? "show" : "collapse"}`}>
                <div className="accordion-body">
                  <div className="row align-items-center">
                    <div className="col">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="最低價格"
                        name="min_price"
                        value={selectedFilters.min_price}
                        onChange={handlePriceChange}
                      />
                    </div>
                    <div className="col-auto">~</div>
                    <div className="col">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="最高價格"
                        name="max_price"
                        value={selectedFilters.max_price}
                        onChange={handlePriceChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* ✅ 手機版篩選按鈕 & 側邊欄 */}
      {isMobile && (
        <>
          {/* 🔹 篩選按鈕 */}
          <button
            className={`${styles.filterToggleBtn} ${isFilterButtonHidden ? styles.hidden : ""}`}
            onClick={toggleFilterSidebar}
          >
            篩選
          </button>

          {/* 🔹 側邊篩選選單 */}
          <aside className={`${styles.mobileAsideFilter} ${isFilterVisible ? styles.show : ""}`}>
            {/* 🔹 關閉按鈕 */}
            <button className={styles.closeBtn} onClick={toggleFilterSidebar}>✖</button>

            <div className="accordion">
              <div className="accordion-item">
                <h2 className="accordion-header">
                  {/* 🔹 切換展開/收合 */}
                  <button
                    className={`accordion-button ${styles.accordionButton} ${expanded === "lens" ? "" : "collapsed"}`}
                    type="button"
                    onClick={() => toggleExpand("lens")}
                  >
                    機身
                  </button>
                </h2>

                {/* 🔹 顯示 / 隱藏內容 */}
                <div className={`accordion-collapse collapse ${expanded === "lens" ? "show" : ""}`}>
                  <div className="accordion-body">
                    {/* 🔹 確保 `filters.category` 存在，否則顯示 `沒有種類資料` */}
                    {Array.isArray(filters.category) && filters.category.length > 0 ? (
                      filters.category.map((category) => (
                        <div key={category.id} className="form-check">
                          <input
                            type="checkbox"
                            id={`category_${category.id}`}
                            name="category_id"
                            value={category.id}
                            className="form-check-input"
                            onChange={handleCheckboxChange}
                          />
                          <label htmlFor={`category_${category.id}`} className="form-check-label">
                            {category.name}
                          </label>
                        </div>
                      ))
                    ) : (
                      <p>沒有種類資料</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 機身 (品牌篩選) */}
              <div className="accordion-item">
                <h2 className="accordion-header">
                  <button
                    className={`accordion-button ${styles.accordionButton} ${expanded === "brand" ? "" : "collapsed"}`}
                    type="button"
                    onClick={() => toggleExpand("brand")}
                  >
                    品牌
                  </button>
                </h2>
                <div className={`accordion-collapse ${expanded === "brand" ? "show" : "collapse"}`}>
                  <div className="accordion-body">
                    {filters.brand.length > 0 ? (
                      filters.brand.map((brand) => (
                        <div key={brand.id} className="form-check">
                          <input
                            type="checkbox"
                            id={`brand_${brand.id}`}
                            name="brand_id"
                            value={brand.id}
                            className="form-check-input"
                            onChange={handleCheckboxChange}
                          />
                          <label htmlFor={`brand_${brand.id}`} className="form-check-label">
                            {brand.name}
                          </label>
                        </div>
                      ))
                    ) : (
                      <p>沒有品牌資料</p>
                    )}
                  </div>
                </div>
              </div>

             {/* 種類 */}
            <div className="accordion-item">
              <h2 className="accordion-header">
                <button
                  className={`accordion-button ${styles.accordionButton} ${expanded === "subcategory" ? "" : "collapsed"}`}
                  type="button"
                  onClick={() => toggleExpand("subcategory")}
                >
                  種類
                </button>
              </h2>
              <div className={`accordion-collapse ${expanded === "subcategory" ? "show" : "collapse"}`}>
                <div className="accordion-body">
                  {filters.subcategory.length > 0 ? (
                    filters.subcategory.map((subcategory) => (
                      <div key={subcategory.id} className="form-check">
                        <input
                          type="checkbox"
                          id={`subcategory${subcategory.id}`}
                          name="subcategory_id"
                          value={subcategory.id}
                          className="form-check-input"
                          onChange={handleCheckboxChange}
                        />
                        <label htmlFor={`subcategory_${subcategory.id}`} className="form-check-label">
                          {subcategory.name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p>沒有品牌資料</p>
                  )}
                </div>
              </div>
            </div>

              {/* ✅ 價格篩選 */}
            <div className="accordion-item">
              <h2 className="accordion-header">
                <button
                  className={`accordion-button ${styles.accordionButton} ${expanded === "price" ? "" : "collapsed"}`}
                  type="button"
                  onClick={() => toggleExpand("price")}
                >
                  價格
                </button>
              </h2>
              <div className={`accordion-collapse ${expanded === "price" ? "show" : "collapse"}`}>
                <div className="accordion-body">
                  <div className="row align-items-center">
                    <div className="col">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="最低價格"
                        name="min_price"
                        value={selectedFilters.min_price}
                        onChange={handlePriceChange}
                      />
                    </div>
                    <div className="col-auto">~</div>
                    <div className="col">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="最高價格"
                        name="max_price"
                        value={selectedFilters.max_price}
                        onChange={handlePriceChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </aside>
        </>
      )}
    </>
  )
}

