'use client'

import React, { useState, useEffect } from 'react'
import styles from './index.module.scss'
import { formatDistanceToNow, format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Tooltip } from 'react-tooltip'
import 'react-tooltip/dist/react-tooltip.css'
import ReplyInput from '../reply-input' // 引入 ReplyInput 組件

// 組織留言資料，將回覆中的回覆依照 parent_id 分組
const organizeComments = (comments) => {
  const topLevel = comments.filter((c) => !c.parent_id)
  const nestedMap = {}
  comments.forEach((c) => {
    if (c.parent_id) {
      if (!nestedMap[c.parent_id]) {
        nestedMap[c.parent_id] = []
      }
      nestedMap[c.parent_id].push(c)
    }
  })
  // 將 nested replies 嵌入對應頂層留言
  return topLevel.map((comment) => ({
    ...comment,
    replies: nestedMap[comment.id] || [],
  }))
}

// 留言項目元件
function ReplyItem({
  userName,
  userProfile,
  text,
  time,
  media_urls,
  media_types,
  replies,
  likeCount: initialLikeCount, // new prop for comment like count
  commentId, // new prop for identifying the comment
  articleId, // ← 讓 ReplyItem 同時接收 articleId
}) {
  const [isLiked, setIsLiked] = useState(false)
  const [commentLikeCount, setCommentLikeCount] = useState(initialLikeCount || 0)
  const [isClicked, setIsClicked] = useState(false)
  const [numVibrate, setNumVibrate] = useState(false)
  const [showReplyInput, setShowReplyInput] = useState(false) // 新增狀態來控制是否顯示輸入框
  // 新增 state 儲存新增的 nested replies
  const [nestedReplies, setNestedReplies] = useState(replies || [])
  const [showNestedReplies, setShowNestedReplies] = useState(true) // 新增 state

  const timeAgo = formatDistanceToNow(new Date(time), {
    locale: zhTW,
    addSuffix: true,
  })

  const formattedTime = format(new Date(time), 'yyyy/MM/dd HH:mm')

  const handleLike = async () => {
    if (isLiked) {
      // Unlike action: decrease count and update state
      const newCount = commentLikeCount - 1
      setIsLiked(false)
      setCommentLikeCount(newCount)
      setNumVibrate(true)
      try {
        await fetch(`http://localhost:8000/api/likes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            likeableId: commentId, // comment id
            likeableType: 'article_comment',
            newLikeCount: newCount,
            // include userId if needed
          }),
          credentials: 'include',
        })
      } catch (error) {
        console.error('Error updating comment unlike:', error)
      }
    } else {
      // Like action: increase count and update state
      setIsLiked(true)
      setIsClicked(true)
      const newCount = commentLikeCount + 1
      setCommentLikeCount(newCount)
      setNumVibrate(true)
      setTimeout(() => setIsClicked(false), 300)
      try {
        await fetch(`http://localhost:8000/api/likes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            likeableId: commentId, // comment id
            likeableType: 'article_comment',
            newLikeCount: newCount,
            // include userId if needed
          }),
          credentials: 'include',
        })
      } catch (error) {
        console.error('Error updating comment like count:', error)
      }
    }
  }

  const handleReplyClick = () => {
    setShowReplyInput(!showReplyInput)
  }

  // 當 newNestedReply 送出時將其加入 nestedReplies state
  const handleNestedReplySubmitted = (newNestedReply) => {
    setNestedReplies((prev) => [...prev, newNestedReply])
    setShowReplyInput(false)
  }

  const toggleNestedReplies = () => {
    setShowNestedReplies(!showNestedReplies)
  }

  return (
    <div className={`d-flex ${styles['y-reply']}`}>
      {/* User Profile */}
      <div className={styles['y-reply-user-profile']}>
        <a href="#">
          <img src={userProfile} alt={userName} />
        </a>
      </div>
      {/* Comment Content */}
      <div className={`mx-3 ${styles['y-reply-content']}`}>
        <a href="#" className="text-black text-decoration-none">
          <h6 className={`mt-2 ${styles['y-reply-user-name']}`}>{userName}</h6>
        </a>
        <div className={styles['y-reply-content']}>
          <p className={`mt-3 ${styles['y-reply-text']}`}>{text}</p>
        </div>
        {media_urls &&
          media_urls.length > 0 &&
          media_urls.map((media_url, index) => {
            const media_type = media_types[index]
            if (media_type === 'image') {
              return (
                <div className={styles['y-reply-img']} key={index}>
                  <img
                    src={`/images/article_com_media/${media_url}`}
                    alt="Reply attachment"
                    style={{
                      width: '40%',
                      height: 'auto',
                      aspectRatio: '16 / 9',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              )
            } else if (media_type === 'video') {
              return (
                <div className={styles['y-reply-img']} key={index}>
                  <video
                    src={`/images/article_com_media/${media_url}`}
                    controls
                    style={{
                      width: '40%',
                      height: 'auto',
                      aspectRatio: '16 / 9',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              )
            } else if (media_type === 'gif') {
              return (
                <div className={styles['y-reply-img']} key={index}>
                  <img
                    src={media_url}
                    alt="Reply attachment"
                    style={{
                      width: '69%',
                      height: 'auto',
                      aspectRatio: '16 / 9',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              )
            }
            return null
          })}
        <div className={`mt-3 d-flex align-items-center ${styles['y-reply-time-like']}`}>
          <h6
            data-tooltip-id={`tooltip-${time}`}
            style={{ cursor: 'pointer' }}
            className="my-auto me-3"
          >
            {timeAgo}
          </h6>
          <Tooltip
            id={`tooltip-${time}`}
            content={formattedTime}
            place="bottom"
            style={{ backgroundColor: '#7E7267' }}
          />
          <div className="d-flex mb-like-reply">
            <button className="ms-sm-3" onClick={handleLike}>
              <img
                src={
                  isLiked
                    ? '/images/article/thumb-up-red.svg'
                    : '/images/article/thumb-up-black.svg'
                }
                alt="Like"
                style={{
                  transform: isClicked ? 'scale(1.5)' : 'scale(1)',
                  transition: 'transform 0.3s ease',
                }}
              />
              <span
                className={`${numVibrate ? styles.vibrate : ''}`}
                onAnimationEnd={() => setNumVibrate(false)}
                style={{ display: 'inline-block', width: '40px', textAlign: 'center' }} // 固定寬度，居中顯示
              >
                {commentLikeCount}
              </span>
            </button>
            <button
              className={`d-flex align-items-center ms-sm-3 ${styles['y-btn-reply-in-reply']}`}
              onClick={handleReplyClick}
            >
              <img src="/images/article/reply-origin.svg" alt="Reply" />
              <span className={`ms-1 ${styles['reply-text']}`}>回覆</span>
            </button>
          </div>
        </div>
        {/* 顯示回覆輸入框 */}
        {showReplyInput && (
          <div className="mt-3" style={{ width: '850px' }}>
            <ReplyInput
              articleId={articleId}    // ← 傳遞正確的文章編號
              parentId={commentId}     // ← parentId 為當前留言編號
              onCommentSubmitted={handleNestedReplySubmitted}
            />
          </div>
        )}
        {/* Render nested replies if available */}
        {nestedReplies && nestedReplies.length > 0 && (
          <>
            <div className={`my-3 ${styles['y-hidden-reply-btn']}`}>
              <button onClick={toggleNestedReplies}>
                {showNestedReplies
                  ? `ㄧ 隱藏留言`
                  : `ㄧ 顯示全部(${nestedReplies.length})留言`}
              </button>
            </div>
            {showNestedReplies &&
              nestedReplies.map((reply) => {
                if (!reply) return null
                return (
                  <NestedReplyItem
                    key={reply.id}
                    userName={reply?.nickname || reply?.name || '匿名'}
                    userProfile={reply.head}
                    text={reply.content}
                    time={reply.created_at}
                    image={reply.media_url}  // 根據實際情況設定
                    parentId={reply.parent_id} // 傳入 parent_id
                  />
                )
              })}
            {showNestedReplies && (
              <div className={`my-3 ${styles['y-hidden-reply-btn']}`}>
                <button onClick={toggleNestedReplies}>
                  ㄧ 隱藏留言
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// 回覆中的回覆元件
function NestedReplyItem({ userName, userProfile, text, time, image, parentId }) {
  const timeAgo = formatDistanceToNow(new Date(time), {
    locale: zhTW,
    addSuffix: true,
  })

  return (
    <div className="d-flex">
      {/* 使用者頭像 */}
      <div className={styles['y-reply-user-profile']}>
        <a href="#">
          <img src={userProfile} alt={userName} />
        </a>
      </div>
      {/* 留言內容 */}
      <div className={`mx-3 ${styles['y-reply-content']}`}>
        <a href="#" className="text-black text-decoration-none">
          <h6 className={`mt-2 ${styles['y-reply-user-name']}`}>{userName}</h6>
        </a>
        {/* 顯示 parentId */}
        <div className={styles['y-reply-content']}>
          <p className={`mt-3 ${styles['y-reply-text']}`}>{text}</p>
        </div>
        {image && (
          <div className={styles['y-reply-img']}>
            <img src={image} alt="Reply attachment" />
          </div>
        )}
        <div className={`mt-3 d-flex align-items-center ${styles['y-reply-time-like']}`}>
          <h6 className="my-auto me-sm-3">{timeAgo}</h6>
          <div className="d-flex mb-like-reply">
            <button className="ms-sm-3">
              <img src="/images/article/thumb-up-black.svg" alt="Like" />
            </button>
            <button className={`d-flex align-items-center ms-sm-3 ${styles['y-btn-reply-in-reply']}`}>
              <img src="/images/article/reply-origin.svg" alt="Reply" />
              <span className={`ms-1 ${styles['reply-text']}`}>回覆</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 主留言區元件
export default function CommentsArea({
  articleId,
  commentCount: initialCount,
  refreshTrigger,
}) {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [count, setCount] = useState(initialCount ?? 0)
  const [comments, setComments] = useState([])

  const toggleComments = () => setIsCollapsed((prev) => !prev)

  useEffect(() => {
    if (!articleId) return
    // 從後端取得該文章的留言數量
    fetch(`http://localhost:8000/api/comments/count?articleId=${articleId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.count !== undefined) {
          setCount(data.count)
        }
      })
      .catch((err) => {
        console.error('取得留言數量失敗：', err)
      })
  }, [articleId, refreshTrigger])

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/article_comments?articleId=${articleId}`
        )
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        const data = await res.json()
        setComments(organizeComments(data.comments))
      } catch (error) {
        console.error('Could not fetch comments:', error)
      }
    }

    if (articleId) {
      fetchComments()
    }
  }, [articleId, refreshTrigger])

  return (
    <div>
      <div className={styles['y-all-comment-btn']}>
        <button onClick={toggleComments}>
          {isCollapsed
            ? `- 顯示全部(${count})留言 -`
            : `- 摺疊全部(${count})留言 -`}
        </button>
      </div>
      {/* 當展開留言時同時顯示排序下拉選單與留言內容 */}
      {!isCollapsed && (
        <>
          <div className={`${styles['y-sort-dropdown']} my-4`}>
            <select
              id="sort-comments"
              name="sort-comments"
              className="form-select"
            >
              <option value="1">由新到舊</option>
              <option value="2">由舊到新</option>
              <option value="3">熱門留言</option>
            </select>
          </div>
          <div className="pt-3">
            {comments.map((comment) => (
              <ReplyItem
                key={comment.id}
                articleId={articleId}               // ← 從最外層傳給 ReplyItem
                commentId={comment.id}
                userName={comment.nickname || comment.name}
                userProfile={comment.head}
                text={comment.content}
                time={comment.created_at}
                media_urls={comment.media_urls}
                media_types={comment.media_types}
                replies={comment.replies}
                likeCount={comment.like_count}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
