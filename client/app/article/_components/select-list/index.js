'use client'  

import React, { useEffect, useState } from 'react';  
import 'bootstrap/dist/css/bootstrap.min.css';  
import 'bootstrap/dist/js/bootstrap.bundle.min.js';  
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';  
import { faAngleDown, faAngleUp } from '@fortawesome/free-solid-svg-icons';  
import styles from './index.module.scss';
import axios from 'axios';


export default function SelectList() {  
  const [isCollapsed, setIsCollapsed] = useState(true);  
  const [categories, setCategories] = useState([
    {value: "", label: "全部類別"}
  ]);
  const [years, setYears] = useState([{ value: '', label: '年份' }]);
  const [months, setMonths] = useState([
    { value: '', label: '月份' },
    { value: '01', label: '01' },
    { value: '02', label: '02' },
    { value: '03', label: '03' },
    { value: '04', label: '04' },
    { value: '05', label: '05' },
    { value: '06', label: '06' },
    { value: '07', label: '07' },
    { value: '08', label: '08' },
    { value: '09', label: '09' },
    { value: '10', label: '10' },
    { value: '11', label: '11' },
    { value: '12', label: '12' },
  ]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get("http://localhost:3005/api/articles/categories");
        const categoryOptions = response.data.data.map(category => ({
          value: category.id,
          label: category.name
        }));
        setCategories(prevCategories => [...prevCategories, ...categoryOptions]);
      } catch (err) {
        console.error("取得分類失敗", err);
      }
    }

    const fetchYears = async () => {
      try {
        const response = await axios.get("http://localhost:3005/api/articles/years");
        const yearOptions = response.data.data.map(year => ({
          value: year.year,
          label: year.year
        }));
        setYears(prevYears => [...prevYears, ...yearOptions]);
      } catch (err) {
        console.error("取得年份失敗", err);
      }
    };

    fetchCategories();
    fetchYears();


    const filterCollapse = document.getElementById('filter-collapse');  

    if (filterCollapse) {  
      const handleShow = () => setIsCollapsed(false);  
      const handleHide = () => setIsCollapsed(true);  

      filterCollapse.addEventListener('show.bs.collapse', handleShow);  
      filterCollapse.addEventListener('hide.bs.collapse', handleHide);  

      return () => {  
        filterCollapse.removeEventListener('show.bs.collapse', handleShow);  
        filterCollapse.removeEventListener('hide.bs.collapse', handleHide);  
      };  
    }  
  }, []);  

  const handleFilterChange = () => {
    const selectedCategory = document.getElementById('select-category').value;
    const selectedYear = document.getElementById('select-year').value;
    const selectedMonth = document.getElementById('select-month').value;
    onFilterChange({ category: selectedCategory, year: selectedYear, month: selectedMonth });
  };

  const renderSelect = (id, options, title) => (  
    <select id={id} className="form-select select04 me-sm-2" title={title}>  
      {options.map((option) => (  
        <option key={option.value} value={option.value}>  
          {option.label}  
        </option>  
      ))}  
    </select>  
  );  

  

  return (  
    <>  
      <div className={`my-sm-5 ${styles['y-list-title']} d-flex justify-content-between align-items-center`}>  
        <h2 className="mb-0">文章列表</h2>  
        <button  
          className="mb-0 btn rounded-pill"  
          type="button"  
          data-bs-toggle="collapse"  
          data-bs-target="#filter-collapse"  
          aria-expanded={!isCollapsed}  
          aria-controls="filter-collapse"  
        >  
          篩選條件  
          <FontAwesomeIcon icon={isCollapsed ? faAngleDown : faAngleUp} className="ms-1" style={{ fontSize: '20px', color: 'black' }} />  
        </button>  
      </div>  

      <div className="mb-4 collapse" id="filter-collapse">  
        <div className="d-flex justify-content-between y-selection">  
          <div className={`d-flex justify-content-start ${styles['y-collapse-area']}`}>  
            {renderSelect('select-category', categories, 'Select Category')}
            {renderSelect('select-year', years, 'Select Year')}
            {renderSelect('select-month', months, 'Select Month')}
          </div>  
          <div className={styles['y-clear-option']}>  
            <button  
              id="y-clear-options-btn"  
              className="btn btn-link"  
              onClick={() => {
                document.querySelectorAll('select').forEach((select) => {
                  select.selectedIndex = 0;
                });
                handleFilterChange();
              }}  
            >  
              清除選項  
            </button>  
          </div>  
        </div>  
      </div>  
    </>  
  );  
}  