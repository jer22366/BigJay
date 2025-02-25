import express, { Router } from 'express'
import cors from 'cors'
import pool from '../db.js'

const router = express.Router()

const corsOptions = {
    origin: ['http://localhost:3000'], // 允許來自 http://localhost:3000 的請求
    credentials: true,
    allowedHeaders: ["Authorization", "Content-Type"],
};

router.use(cors(corsOptions)); // 使用 cors 中間件

router.get("/", async (req, res) => {
    try {
        // 插入資料
        const [result] = await pool.execute(
            `SELECT u.name, c.name as cpName, c.start_date, c.end_date, c.discount, c.img FROM users u 
            inner Join user_coupon uc on uc.user_id = u.id 
            inner Join coupon c on c.id = uc.coupon_id;
         `
        );

        res.status(200).json({ success: true, message: "優惠券獲取成功", result });
    } catch (error) {
        console.error("優惠券獲取失敗:", error);
        res.status(500).json({ success: false, message: "優惠券獲取失敗", error });
    }
})

export default router