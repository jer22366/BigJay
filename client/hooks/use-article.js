import {useState, useEffect} from 'react';
import axios from 'axios';

const useArticles = (filter = {}) => {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try{
        let url = 'http://localhost:3005/api/articles';
        const queryParams = new URLSearchParams();

        if(filter.year) queryParams.append("year", filter.year);//如果有年份就加入queryParams
        if(filter.month) queryParams.append("month", filter.month);//如果有月份就加入queryParams
        if(filter.category) queryParams.append("category", filter.category);//如果有分類就加入queryParams

        if (queryParams.toString()) {
          url += "?" + queryParams.toString();//如果有queryParams就加入url
        }

        const response = await axios.get(url);//發送請求
        setArticles(response.data.data);//將資料存入articles
      }catch(err){
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [filter]);

  return {articles, error, loading};
};

export default useArticles;