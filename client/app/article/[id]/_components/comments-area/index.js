'use client'

import React, { useState, useEffect, useRef } from 'react'
import styles from './index.module.scss'
import { formatDistanceToNow, format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Tooltip } from 'react-tooltip'
import 'react-tooltip/dist/react-tooltip.css'
import ReplyInput from '../reply-input'
import MediaRenderer from '../media-render'
import GifImage from '../gif-image'
import ContentLoader from 'react-content-loader'
import { jwtDecode } from 'jwt-decode' // 添加 jwtDecode 導入
import { toast } from 'react-toastify' // 添加 toast 導入，用於錯誤訊息

// 新增：回覆區段的渲染動畫元件
const NestedReplyLoader = () => {
  const numberOfLoaders = 1
  return (
    <>
      {Array.from({ length: numberOfLoaders }).map((_, index) => (
        <div key={index} style={{ marginBottom: '10px' }}>
          <ContentLoader
            speed={2}
            width={300}
            height={60}
            viewBox="0 0 300 60"
            backgroundColor="#f3f3f3"
            foregroundColor="#ecebeb"
          >
            <rect x="0" y="0" rx="5" ry="5" width="40" height="40" />
            <rect x="50" y="10" rx="4" ry="4" width="240" height="10" />
            <rect x="50" y="30" rx="4" ry="4" width="200" height="10" />
          </ContentLoader>
        </div>
      ))}
    </>
  )
}

// 新增父回覆的渲染動畫元件
const ReplyItemLoader = () => {
  return (
    <div className={`d-flex ${styles['y-reply']}`}>
      <div className={styles['y-reply-user-profile']}>
        <ContentLoader
          speed={2}
          width={50}
          height={50}
          viewBox="0 0 50 50"
          backgroundColor="#f3f3f3"
          foregroundColor="#ecebeb"
        >
          <circle cx="25" cy="25" r="25" />
        </ContentLoader>
      </div>
      <div className={`mx-3 ${styles['y-reply-content']}`}>
        <ContentLoader
          speed={2}
          width={300}
          height={20}
          viewBox="0 0 300 20"
          backgroundColor="#f3f3f3"
          foregroundColor="#ecebeb"
        >
          <rect x="0" y="0" rx="4" ry="4" width="300" height="20" />
        </ContentLoader>
        <ContentLoader
          speed={2}
          width={300}
          height={15}
          viewBox="0 0 300 15"
          backgroundColor="#f3f3f3"
          foregroundColor="#ecebeb"
        >
          <rect x="0" y="0" rx="4" ry="4" width="300" height="15" />
        </ContentLoader>
      </div>
    </div>
  )
}

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
  likeCount: initialLikeCount,
  commentId,
  articleId,
  activeMenuId,      // 從父組件接收
  setActiveMenuId,   // 從父組件接收
  is_edited,
  updated_at,
  // 新增：接收全局編輯ID和設置函數
  currentEditingId,
  setCurrentEditingId,
  onCommentDeleted,
  isAuthenticated, // 添加這行
  showAuthModal, // 添加這行
  activeReplyId, // 新增
  handleReplyClick, // 新增
  currentReplyTo, // 新增
  token, // 新增
  userId, // 新增
  onCommentSubmitted // 新增
}) {
  // 新增：控制父回覆初次顯示的 loader
  const [showLoader, setShowLoader] = useState(true)

  const [isLiked, setIsLiked] = useState(false)
  const [commentLikeCount, setCommentLikeCount] = useState(initialLikeCount || 0)
  const [isClicked, setIsClicked] = useState(false)
  const [numVibrate, setNumVibrate] = useState(false)
  const [nestedReplies, setNestedReplies] = useState(replies || [])
  const [showNestedReplies, setShowNestedReplies] = useState(false)
  const [isNestedRepliesLoading, setIsNestedRepliesLoading] = useState(false)
  const [moreHover, setMoreHover] = useState(false)
  const inputRef = useRef(null)

  // 將本地 isEditing 狀態與全局編輯ID綁定
  const isEditing = currentEditingId === commentId;
  const [editedText, setEditedText] = useState(text)
  const [isEdited, setIsEdited] = useState(is_edited ? true : false) // 從服務器獲取是否已編輯
  const [updatedTime, setUpdatedTime] = useState(updated_at || null) // 從服務器獲取更新時間
  const [displayText, setDisplayText] = useState(text)
  const [isHovered, setIsHovered] = useState(false)
  const [isSent, setIsSent] = useState(false) // 添加 isSent 狀態
  // 新增：用於強制讓嵌套回覆容器重新渲染
  const [nestedRepliesKey, setNestedRepliesKey] = useState(Date.now())

  const [localToken, setLocalToken] = useState(null)
  const [localUserId, setLocalUserId] = useState(null)

  // 在組件載入時獲取 token 和 userId
  useEffect(() => {
    // 如果已經從父組件接收到 token 和 userId，則直接使用
    if (token && userId) return;

    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('loginWithToken')
      if (storedToken) {
        setLocalToken(storedToken)
        try {
          const decoded = jwtDecode(storedToken)
          setLocalUserId(decoded.id) // 假設JWT中包含用戶ID
        } catch (error) {
          console.error('解析JWT失敗:', error)
        }
      }
    }
  }, [token, userId])

  // 使用時優先使用從父組件傳入的值，再回退到本地狀態
  const effectiveToken = token || localToken
  const effectiveUserId = userId || localUserId

  // 檢查用戶是否已點讚
  useEffect(() => {
    if (!effectiveToken || !effectiveUserId || !commentId) return;

    const checkLikeStatus = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/likes/check?userId=${effectiveUserId}&commentId=${commentId}&type=comment`,
          {
            headers: {
              Authorization: `Bearer ${effectiveToken}`,
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setIsLiked(data.isLiked);
        }
      } catch (error) {
        console.error('檢查點讚狀態失敗:', error);
      }
    };

    checkLikeStatus();
  }, [commentId, effectiveToken, effectiveUserId]);

  // 定義選單識別字串
  const menuKey = `reply-${commentId}`
  const isMenuOpen = activeMenuId === menuKey

  // 检查 timeAgo 和 formattedTime 计算逻辑
  useEffect(() => {
    // 調試輸出
    console.log('時間數據:', {
      updatedTime,
      originalTime: time,
      isEdited
    });

    // 如果有更新時間，確保它是有效的日期對象
    if (updatedTime) {
      try {
        const testDate = new Date(updatedTime);
        if (isNaN(testDate.getTime())) {
          console.error('無效的更新時間格式:', updatedTime);
        } else {
          console.log('有效的更新時間:', testDate);
        }
      } catch (err) {
        console.error('解析更新時間出錯:', err);
      }
    }
  }, [updatedTime, time, isEdited]);

  // 計算顯示時間
  const timeAgo = formatDistanceToNow(new Date(time), {
    locale: zhTW,
    addSuffix: true
  });
  const formattedTime = updatedTime && !isNaN(new Date(updatedTime).getTime())
    ? format(new Date(updatedTime), 'yyyy/MM/dd HH:mm')
    : format(new Date(time), 'yyyy/MM/dd HH:mm');

  const isReadyToSend = editedText.trim().length > 0;

  const sendIcon = isReadyToSend
    ? isHovered
      ? '/images/article/sended-hover.svg'
      : '/images/article/sended.svg'
    : isHovered
      ? '/images/article/sended-hover.svg'
      : '/images/article/sended-black.svg'


  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  const handleLike = async () => {
    if (!isAuthenticated || !effectiveToken) {
      showAuthModal();
      return;
    }

    if (!effectiveUserId) {
      console.error('無法獲取用戶ID');
      toast.error('操作失敗，請重新登入');
      return;
    }

    try {
      // 根據當前狀態決定操作
      const method = isLiked ? 'DELETE' : 'POST';
      const newCount = isLiked ? commentLikeCount - 1 : commentLikeCount + 1;

      // 先更新UI，提供即時反饋
      setIsLiked(!isLiked);
      setCommentLikeCount(newCount);
      setNumVibrate(true);
      if (!isLiked) {
        setIsClicked(true);
        setTimeout(() => setIsClicked(false), 300);
      }

      await fetch(`http://localhost:8000/api/likes`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify({
          likeableId: commentId,
          likeableType: 'comment', // 修改這裡，從 'article_comment' 改為 'comment'
          newLikeCount: newCount,
          userId: effectiveUserId,
        }),
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error updating comment like:', error);
      // 如果失敗，恢復原始狀態
      setIsLiked(isLiked);
      setCommentLikeCount(isLiked ? commentLikeCount : commentLikeCount);
    }
  }

  // 其餘邏輯維持不變
  // 每次點擊回覆時更新 replyTo，若未顯示則打開輸入框
  const onReplyButtonClick = () => {
    handleReplyClick(commentId, userName);
  };

  // 新增：處理嵌套回覆提交後的數據
  const handleNestedReplySubmitted = (parentId, newNestedReply) => {
    if (newNestedReply && typeof newNestedReply === 'object') {
      console.log('New nested reply received:', newNestedReply);

      // 改進數據處理，確保所有必要字段都存在
      const processedReply = {
        ...newNestedReply,
        // 確保有 nickname 或 name
        nickname: newNestedReply.nickname || newNestedReply.name,
        // 處理媒體字段，統一命名，並確保是陣列格式
        media_urls: newNestedReply.media_urls || newNestedReply.media_url || [],
        media_types: newNestedReply.media_types || newNestedReply.media_type || [],
        // 確保其他必要字段
        parent_id: parentId,
        like_count: newNestedReply.like_count || 0,
        is_edited: false,
      };

      // 確保媒體字段是陣列
      if (!Array.isArray(processedReply.media_urls)) {
        processedReply.media_urls = processedReply.media_urls ? [processedReply.media_urls] : [];
      }
      if (!Array.isArray(processedReply.media_types)) {
        processedReply.media_types = processedReply.media_types ? [processedReply.media_types] : [];
      }

      // 修改這裡：將新回覆添加到頂部，而不是底部
      setNestedReplies(prevReplies => [processedReply, ...prevReplies]);
      setShowNestedReplies(true);

      // 強制重新渲染
      setNestedRepliesKey(Date.now());

      // 關閉回覆輸入框
      handleReplyClick(null, '');
    } else {
      console.error('Invalid nested reply data:', newNestedReply);
    }
  };


  // 父回覆不使用 nested reply 的渲染動畫，直接切換顯示/隱藏
  const toggleNestedReplies = () => {
    setShowNestedReplies((prev) => !prev)
  }

  // 修改：點擊編輯按鈕後進入編輯模式
  const handleEdit = () => {
    setEditedText(displayText); // 確保編輯框內顯示當前顯示的文字
    setCurrentEditingId(commentId);
    setActiveMenuId(null); // 關閉選單
  }

  // 取消編輯
  const handleCancelEdit = () => {
    setCurrentEditingId(null);
    setEditedText(displayText); // 恢復原始文字
  }

  // 修改：提交更新
  const handleUpdate = async () => {
    if (!editedText.trim()) return;

    setIsSent(true);
    setTimeout(() => setIsSent(false), 300);

    try {
      const res = await fetch(`http://localhost:8000/api/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editedText }),
        credentials: 'include',
      });

      const data = await res.json();
      console.log('更新留言返回資料:', data); // 確保這行代碼有執行

      if (data.success) {
        setDisplayText(editedText);
        setIsEdited(true);

        // 檢查後端返回的數據結構
        console.log('後端返回的時間數據:', {
          updatedTime: data.updatedTime,
          updated_at: data.updated_at,
          update_time: data.update_time,
          data_time: data.time
        });

        // 處理不同欄位名稱的可能性
        let newUpdatedTime;
        if (data.updated_at) {
          newUpdatedTime = data.updated_at;
        } else if (data.update_time) {
          newUpdatedTime = data.update_time;
        } else if (data.time) {
          newUpdatedTime = data.time;
        } else if (data.data && data.data.updated_at) {
          newUpdatedTime = data.data.updated_at;
        } else {
          // 如果後端沒有返回時間，使用當前時間
          newUpdatedTime = new Date().toISOString();
        }

        console.log('設置的更新時間:', newUpdatedTime);
        setUpdatedTime(newUpdatedTime);

        setCurrentEditingId(null);
      } else {
        alert(data.message || '更新失敗');
      }
    } catch (error) {
      console.error('更新留言失敗:', error);
      alert('更新留言失敗，請稍後再試');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('確定要刪除此留言嗎？')) {
      try {
        const res = await fetch(`http://localhost:8000/api/comments/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        const data = await res.json();

        if (data.success) {
          // 通知父組件進行刪除
          onCommentDeleted(id);
        } else {
          alert(data.message || '刪除失敗');
        }
      } catch (err) {
        console.error('刪除留言失敗:', err);
        alert('刪除留言失敗，請稍後再試');
      }
    }
  };

  const toggleMoreOptions = (e) => {
    e.stopPropagation()
    setActiveMenuId(isMenuOpen ? null : menuKey)
  }

  useEffect(() => {
    const closeMoreOptions = (e) => {
      if (isMenuOpen && !e.target.closest(`.${styles.moreBtnReply}`)) {
        setActiveMenuId(null);
      }
    };

    document.addEventListener('click', closeMoreOptions);
    return () => {
      document.removeEventListener('click', closeMoreOptions);
    };
  }, [isMenuOpen]);

  // 添加 ESC 鍵監聽
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isEditing) {
        handleCancelEdit();
      }
    };

    if (isEditing) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isEditing]);

  // 在 ReplyItem 組件中新增這個函數
  const handleNestedReplyDeleted = (deletedId) => {
    console.log('Deleting nested reply:', deletedId);
    // 從當前的嵌套回覆陣列中移除被刪除的回覆
    setNestedReplies(prev => prev.filter(reply => reply.id !== deletedId));

    // 同時通知父組件更新總計數
    onCommentDeleted && onCommentDeleted(deletedId, commentId);
  };

  // 修改：使用父組件傳遞的全局狀態
  const showReplyInput = activeReplyId === commentId;
  const replyTo = currentReplyTo;

  return (
    <>
      {showLoader ? (
        <ReplyItemLoader />
      ) : (
        <div className={`d-flex ${styles['y-reply']} ${isEditing ? styles['editing-mode'] : ''}`}>
          <div className={styles['y-reply-user-profile']}>
            <a href="#">
              <img src={userProfile} alt={userName} />
            </a>
          </div>
          <div className="d-flex justify-content-between w-100 pe-2">
            <div className={`mx-3 ${styles['y-reply-content']}`}>
              <a href="#" className="text-black text-decoration-none">
                <h6 className={`mt-2 ${styles['y-reply-user-name']}`}>{userName}</h6>
              </a>

              {/* 加入遮罩層 */}
              {isEditing && <div className={styles['editing-overlay']}></div>}

              <div className={`${styles['y-reply-content']} ${isEditing ? styles['editing-area'] : ''}`}>
                <p className={`mt-3 ${styles['y-reply-text']}`}>
                  {displayText}
                </p>
              </div>
              {isEditing && (
                <div className={styles.modalOverlay}>
                  <div className={`${styles.modalContent} d-flex flex-column`}>
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      autoFocus
                      className={styles.editingTextArea}
                    />
                    <div className={styles['editing-buttons'] + ' d-flex justify-content-between align-items-center'}>
                      <small className="text-secondary">按下 ESC 即可取消</small>
                      <button
                        className={`${styles['btn-editor-reply-save']} p-1 sendIcon`}
                        onClick={handleUpdate}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                      >
                        <img
                          src={sendIcon}
                          alt="發送"
                          className={isSent ? styles.active : ''}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {media_urls &&
                media_urls.length > 0 &&
                media_urls.map((media_url, index) => {
                  const media_type = media_types[index]
                  return (
                    <MediaRenderer
                      media_type={media_type}
                      media_url={media_url}
                      key={index}
                    />
                  )
                })}
              <div className={`mt-3 d-flex align-items-center ${styles['y-reply-time-like']}`}>
                <h6
                  data-tooltip-id={`tooltip-${time}`}
                  style={{ cursor: 'pointer' }}
                  className="my-auto me-3"
                >
                  {timeAgo} {isEdited && <span className={styles.editedMark}>（已編輯）</span>}
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
                      style={{ display: 'inline-block', width: '40px', textAlign: 'center' }}
                    >
                      {commentLikeCount}
                    </span>
                  </button>
                  <button
                    className={`d-flex align-items-center ms-sm-3 ${styles['y-btn-reply-in-reply']}`}
                    onClick={onReplyButtonClick} // 修改這裡，使用新的處理函數
                  >
                    <img src="/images/article/reply-origin.svg" alt="Reply" />
                    <span className={`ms-1 ${styles['reply-text']}`}>回覆</span>
                  </button>
                </div>
              </div>
              {showReplyInput && (
                <div
                  ref={inputRef}
                  id={`reply-input-${commentId}`}
                  className={styles['fade-in']}
                  style={{ transition: 'opacity 0.3s', width: '850px' }}
                >
                  <ReplyInput
                    articleId={articleId}
                    parentId={commentId}
                    onCommentSubmitted={(newNestedReply) => handleNestedReplySubmitted(commentId, newNestedReply)}
                    replyTo={replyTo}
                    isAuthenticated={isAuthenticated} // 已在留言區內，所以一定是登入的
                    showAuthModal={showAuthModal} // 在此環境下不需要真正調用，但需要提供一個空函數
                  />
                </div>
              )}
              {nestedReplies && nestedReplies.length > 0 && (
                <>
                  <div className={`my-3 ${styles['y-hidden-reply-btn']}`}>
                    <button onClick={toggleNestedReplies}>
                      {showNestedReplies
                        ? `ㄧ 隱藏回覆`
                        : `ㄧ ${nestedReplies.length}則回覆`}
                    </button>
                  </div>
                  {showNestedReplies && (
                    <div key={nestedRepliesKey}>
                      {nestedReplies.map((reply, idx) => {
                        if (!reply) return null
                        return (
                          <NestedReplyItem
                            key={reply.id || idx}
                            userName={reply?.nickname || reply?.name}
                            userProfile={reply.head}
                            text={reply.content}
                            time={reply.created_at}
                            // 修改這裡，統一命名為 media_urls 和 media_types
                            media_urls={reply.media_urls || reply.media_url}
                            media_types={reply.media_types || reply.media_type}
                            parentId={reply.parent_id}
                            commentId={reply.id}
                            initialLikeCount={reply.like_count}
                            // 其餘保持不變
                            onReplyClick={handleReplyClick}
                            activeMenuId={activeMenuId}
                            setActiveMenuId={setActiveMenuId}
                            currentEditingId={currentEditingId}
                            setCurrentEditingId={setCurrentEditingId}
                            is_edited={reply.is_edited}
                            updated_at={reply.updated_at}
                            onCommentDeleted={handleNestedReplyDeleted}
                            isAuthenticated={isAuthenticated}
                            showAuthModal={showAuthModal}
                            token={token}
                            userId={userId}
                          />
                        )
                      })}
                      <div className={`my-3 ${styles['y-hidden-reply-btn']}`}>
                        <button onClick={toggleNestedReplies}>ㄧ 隱藏回覆</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className={`${styles.moreBtnReply}`}
              onMouseEnter={() => setMoreHover(true)}
              onMouseLeave={() => setMoreHover(false)}
            >
              <button className={styles['more-btn']} onClick={toggleMoreOptions}>
                <img
                  src={moreHover ? '/images/article/more-hover.svg' : '/images/article/more-origin.svg'}
                  alt=""
                />
              </button>
              <div className={`${styles.moreOptions} ${isMenuOpen ? styles.show : ''}`}>
                <div
                  className={styles.moreOption}
                  onClick={() => handleEdit(commentId)}
                >
                  <img
                    src="/images/article/edit-origin.svg"
                    alt="編輯原圖"
                    className={styles.iconOriginal}
                  />
                  <img
                    src="/images/article/edit-hover.svg"
                    alt="編輯 hover 圖"
                    className={styles.iconHover}
                  />
                  編輯
                </div>
                <div
                  className={styles.moreOptionDelete}
                  onClick={() => handleDelete(commentId)}
                >
                  <img
                    src="/images/article/delete-origin.svg"
                    alt="刪除原圖"
                    className={styles.iconOriginalDelete}
                  />
                  <img
                    src="/images/article/delete-hover.svg"
                    alt="刪除 hover 圖"
                    className={styles.iconHoverDelete}
                  />
                  刪除
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// 回覆中的回覆元件
function NestedReplyItem({
  userName,
  onReplyClick,
  parentId,
  activeMenuId,
  setActiveMenuId,
  currentEditingId,  // 新增
  setCurrentEditingId,  // 新增
  is_edited,  // 新增
  updated_at,  // 新增
  onCommentDeleted, // 新增
  isAuthenticated, // 添加這行
  showAuthModal, // 添加這行
  token, // 新增
  userId, // 新增
  ...props
}) {
  const [isLiked, setIsLiked] = useState(false)
  const [commentLikeCount, setCommentLikeCount] = useState(props.initialLikeCount || 0)
  const [isClicked, setIsClicked] = useState(false)
  const [numVibrate, setNumVibrate] = useState(false)
  const [moreHover, setMoreHover] = useState(false)

  const parsedTime = new Date(props.time)
  const validTime = isNaN(parsedTime.getTime()) ? new Date() : parsedTime

  const timeAgo = formatDistanceToNow(validTime, {
    locale: zhTW,
    addSuffix: true,
  })
  const formattedTime = format(validTime, 'yyyy/MM/dd HH:mm')

  // 定義選單識別字串
  const menuKey = `nested-${props.commentId}`
  const isMenuOpen = activeMenuId === menuKey

  const isEditing = currentEditingId === props.commentId;
  const initialText = props.text || props.content || '';
  const [displayText, setDisplayText] = useState(initialText);
  const [editedText, setEditedText] = useState(initialText);

  // 當 props.text 或 props.content 變化時更新顯示內容
  useEffect(() => {
    const newText = props.text || props.content || '';
    if (newText && newText !== displayText) {
      setDisplayText(newText);
      setEditedText(newText);
      console.log('更新嵌套回覆內容:', newText);
    }
  }, [props.text, props.content]);

  const [isEdited, setIsEdited] = useState(is_edited ? true : false)
  const [updatedTime, setUpdatedTime] = useState(updated_at || null)
  const [isHovered, setIsHovered] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const isReadyToSend = editedText?.trim().length > 0;

  const sendIcon = isReadyToSend
    ? isHovered
      ? '/images/article/sended-hover.svg'
      : '/images/article/sended.svg'
    : isHovered
      ? '/images/article/sended-hover.svg'
      : '/images/article/sended-black.svg';

  const toggleMoreOptions = (e) => {
    e.stopPropagation()
    setActiveMenuId(isMenuOpen ? null : menuKey)
  }

  const [localToken, setLocalToken] = useState(null)
  const [localUserId, setLocalUserId] = useState(null)

  // 在組件載入時獲取 token 和 userId
  useEffect(() => {
    // 如果已經從父組件接收到 token 和 userId，則直接使用
    if (token && userId) return;

    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('loginWithToken')
      if (storedToken) {
        setLocalToken(storedToken)
        try {
          const decoded = jwtDecode(storedToken)
          setLocalUserId(decoded.id)
        } catch (error) {
          console.error('解析JWT失敗:', error)
        }
      }
    }
  }, [token, userId])

  // 使用時優先使用從父組件傳入的值，再回退到本地狀態
  const effectiveToken = token || localToken
  const effectiveUserId = userId || localUserId

  const handleLike = async () => {
    if (!isAuthenticated || !effectiveToken) {
      showAuthModal();
      return;
    }

    if (!effectiveUserId) {
      console.error('無法獲取用戶ID');
      toast.error('操作失敗，請重新登入');
      return;
    }

    try {
      // 根據當前狀態決定操作
      const method = isLiked ? 'DELETE' : 'POST';
      const newCount = isLiked ? commentLikeCount - 1 : commentLikeCount + 1;

      // 先更新UI，提供即時反饋
      setIsLiked(!isLiked);
      setCommentLikeCount(newCount);
      setNumVibrate(true);
      if (!isLiked) {
        setIsClicked(true);
        setTimeout(() => setIsClicked(false), 300);
      }

      await fetch(`http://localhost:8000/api/likes`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify({
          likeableId: props.commentId,
          likeableType: 'comment', // 修改這裡，從 'article_comment' 改為 'comment'
          newLikeCount: newCount,
          userId: effectiveUserId,
        }),
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error updating comment like:', error);
      // 如果失敗，恢復原始狀態
      setIsLiked(isLiked);
      setCommentLikeCount(isLiked ? commentLikeCount : commentLikeCount);
    }
  }

  // 添加以下 useEffect 檢查點讚狀態
  useEffect(() => {
    if (!effectiveToken || !effectiveUserId || !props.commentId) return;

    const checkLikeStatus = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/likes/check?userId=${effectiveUserId}&commentId=${props.commentId}&type=comment`,
          {
            headers: {
              Authorization: `Bearer ${effectiveToken}`,
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setIsLiked(data.isLiked);
        }
      } catch (error) {
        console.error('檢查點讚狀態失敗:', error);
      }
    };

    checkLikeStatus();
  }, [props.commentId, effectiveToken, effectiveUserId]);

  const handleNestedReplyClick = () => {
    onReplyClick && onReplyClick(parentId, userName);
    // 不再需要滾動到特定輸入框，因為只有一個會顯示
  };

  const handleEdit = () => {
    setEditedText(displayText);
    setCurrentEditingId(props.commentId);
    setActiveMenuId(null);
  };

  // 取消編輯
  const handleCancelEdit = () => {
    setCurrentEditingId(null);
    setEditedText(displayText);
  };

  // 更新留言
  const handleUpdate = async () => {
    if (!editedText.trim()) return;

    setIsSent(true);
    setTimeout(() => setIsSent(false), 300);

    try {
      const res = await fetch(`http://localhost:8000/api/comments/${props.commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editedText }),
        credentials: 'include',
      });

      const data = await res.json();
      console.log('更新留言返回資料:', data); // 確保這行代碼有執行

      if (data.success) {
        setDisplayText(editedText);
        setIsEdited(true);

        // 檢查後端返回的數據結構
        console.log('後端返回的時間數據:', {
          updatedTime: data.updatedTime,
          updated_at: data.updated_at,
          update_time: data.update_time,
          data_time: data.time
        });

        // 處理不同欄位名稱的可能性
        let newUpdatedTime;
        if (data.updated_at) {
          newUpdatedTime = data.updated_at;
        } else if (data.update_time) {
          newUpdatedTime = data.update_time;
        } else if (data.time) {
          newUpdatedTime = data.time;
        } else if (data.data && data.data.updated_at) {
          newUpdatedTime = data.data.updated_at;
        } else {
          // 如果後端沒有返回時間，使用當前時間
          newUpdatedTime = new Date().toISOString();
        }

        console.log('設置的更新時間:', newUpdatedTime);
        setUpdatedTime(newUpdatedTime);

        setCurrentEditingId(null);
      } else {
        alert(data.message || '更新失敗');
      }
    } catch (error) {
      console.error('更新留言失敗:', error);
      alert('更新留言失敗，請稍後再試');
    }
  };

  // 添加 ESC 鍵監聽
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isEditing) {
        handleCancelEdit();
      }
    };

    if (isEditing) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isEditing]);

  const handleDelete = async (id) => {
    if (confirm('確定要刪除此留言嗎？')) {
      try {
        const res = await fetch(`http://localhost:8000/api/comments/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success) {
          // 通知父組件從 UI 移除此回覆
          onCommentDeleted && onCommentDeleted(id, parentId);
        } else {
          alert(data.message || '刪除失敗');
        }
      } catch (err) {
        console.error('刪除留言失敗:', err);
        alert('刪除留言失敗，請稍後再試');
      }
    }
  };

  return (
    <div className="d-flex">
      <div className={styles['y-reply-user-profile']}>
        <a href="#">
          <img src={props.userProfile} alt={userName} />
        </a>
      </div>
      <div className="d-flex justify-content-between w-100 mx-3">
        <div className={` ${styles['y-reply-content-nested-out']}`}>
          <a href="#" className="text-black text-decoration-none">
            <h6 className={`mt-2 ${styles['y-reply-user-name']}`}>{userName}</h6>
          </a>
          {isEditing && <div className={styles['editing-overlay']}></div>}
          <div className={`${styles['y-reply-content-nested']} ${isEditing ? styles['editing-area'] : ''}`}>
            <p className={`mt-3 ${styles['y-reply-text']}`}>{displayText}</p>
          </div>
          {isEditing && (
            <div className={styles.modalOverlay}>
              <div className={`${styles.modalContent} d-flex flex-column`}>
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  autoFocus
                  className={styles.editingTextArea}
                />
                <div className={styles['editing-buttons'] + ' d-flex justify-content-between align-items-center'}>
                  <small className="text-secondary">按下 ESC 即可取消</small>
                  <button
                    className={`${styles['btn-editor-reply-save']} p-1 sendIcon`}
                    onClick={handleUpdate}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                  >
                    <img
                      src={sendIcon}
                      alt="發送"
                      className={isSent ? styles.active : ''}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* 簡化媒體渲染邏輯 */}
          {(() => {
            // 統一獲取媒體資源
            const mediaUrls = props.media_urls || [];
            const mediaTypes = props.media_types || [];

            // 確保都是陣列格式
            const urlsArray = Array.isArray(mediaUrls) ? mediaUrls : [mediaUrls];
            const typesArray = Array.isArray(mediaTypes) ? mediaTypes : [mediaTypes];

            if (urlsArray.length === 0 || !urlsArray[0]) return null;

            return urlsArray.map((url, index) => {
              if (!url) return null;
              const type = typesArray[index] || 'image';

              return (
                <MediaRenderer
                  key={`${props.commentId}-media-${index}`}
                  media_type={type}
                  media_url={url}
                />
              );
            });
          })()}
          <div className={`mt-3 d-flex align-items-center ${styles['y-reply-time-like']}`}>
            <h6
              data-tooltip-id={`tooltip-nested-${props.time}`}
              style={{ cursor: 'pointer' }}
              className="my-auto me-3"
            >
              {timeAgo} {isEdited && <span className={styles.editedMark}>（已編輯）</span>}
            </h6>
            <Tooltip
              id={`tooltip-nested-${props.time}`}
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
                  style={{ display: 'inline-block', width: '40px', textAlign: 'center' }}
                >
                  {commentLikeCount}
                </span>
              </button>
              <button
                className={`d-flex align-items-center ms-sm-3 ${styles['y-btn-reply-in-reply']}`}
                onClick={handleNestedReplyClick}
              >
                <img src="/images/article/reply-origin.svg" alt="Reply" />
                <span className={`ms-1 ${styles['reply-text']}`}>回覆</span>
              </button>
            </div>
          </div>
        </div>
        <div className={`${styles.moreBtnReply}`}>
          <button className={styles['more-btn']} onClick={toggleMoreOptions}>
            <img
              src={moreHover ? '/images/article/more-hover.svg' : '/images/article/more-origin.svg'}
              alt="More"
            />
          </button>
          <div className={`${styles.moreOptions} ${isMenuOpen ? styles.show : ''}`}>
            <div
              className={styles.moreOption}
              onClick={() => handleEdit(props.commentId)}
            >
              <img
                src="/images/article/edit-origin.svg"
                alt="編輯原圖"
                className={styles.iconOriginal}
              />
              <img
                src="/images/article/edit-hover.svg"
                alt="編輯 hover 圖"
                className={styles.iconHover}
              />
              編輯
            </div>
            <div
              className={styles.moreOptionDelete}
              onClick={() => handleDelete(props.commentId)}
            >
              <img
                src="/images/article/delete-origin.svg"
                alt="刪除原圖"
                className={styles.iconOriginalDelete}
              />
              <img
                src="/images/article/delete-hover.svg"
                alt="刪除 hover 圖"
                className={styles.iconHoverDelete}
              />
              刪除
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 主留言區元件
export default function CommentsArea({ articleId, refreshTrigger, isAuthenticated, showAuthModal, token, userId }) {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [count, setCount] = useState(0)
  const [previousCount, setPreviousCount] = useState(0) // 新增：追蹤上一次留言數量
  const [isInitialized, setIsInitialized] = useState(false) // 新增：追蹤是否完成初始化
  const [comments, setComments] = useState([])
  const [sortOption, setSortOption] = useState('1')
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [currentEditingId, setCurrentEditingId] = useState(null)
  const [activeReplyId, setActiveReplyId] = useState(null) // 新增
  const [currentReplyTo, setCurrentReplyTo] = useState('') // 新增

  const toggleComments = () => setIsCollapsed((prev) => !prev)

  // 新增：監控留言數量變化，當有新留言時自動展開
  useEffect(() => {
    if (!isInitialized && count > 0) {
      // 首次載入完成初始化
      setIsInitialized(true);
      setPreviousCount(count);
      setIsCollapsed(false);
      return;
    }

    if (isInitialized && count > previousCount) {
      // 新增留言時，自動展開留言區
      setIsCollapsed(false);
    }

    // 更新前一次的留言數量
    setPreviousCount(count);
  }, [count, isInitialized]);

  useEffect(() => {
    if (!articleId) return
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
    if (!isCollapsed && articleId) {
      const fetchComments = async () => {
        try {
          const res = await fetch(`http://localhost:8000/api/article_comments?articleId=${articleId}`);
          if (!res.ok) {
            // 檢查回應是否為 JSON 格式
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const errorData = await res.json();
              throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
            } else {
              // 如果不是 JSON 格式，則直接顯示錯誤訊息
              const errorText = await res.text();
              throw new Error(errorText || `HTTP error! status: ${res.status}`);
            }
          }
          const data = await res.json();
          setComments(organizeComments(data.comments));
        } catch (error) {
          console.error('Could not fetch comments:', error);
          // 顯示錯誤訊息給使用者
          alert('取得留言失敗：' + error.message);
        }
      };
      fetchComments();
    }
  }, [articleId, refreshTrigger, isCollapsed]);

  const getSortedComments = () => {
    const sorted = [...comments]
    if (sortOption === '1') {
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else if (sortOption === '2') {
      sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    } else if (sortOption === '3') {
      sorted.sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
    }
    return sorted
  }

  // 在 CommentsArea 組件中添加
  const handleCommentDeleted = (deletedId, parentId = null) => {
    if (!parentId) {
      // 刪除主評論
      setComments(prev => prev.filter(comment => comment.id !== deletedId));
      setCount(prev => prev - 1);
    } else {
      // 刪除巢狀評論
      setComments(prev => prev.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: comment.replies.filter(reply => reply.id !== deletedId)
          };
        }
        return comment;
      }));
      setCount(prev => prev - 1);
    }
  };

  // 新增：統一處理回覆框打開關閉的函數
  const handleReplyClick = (commentId, replyToName) => {
    // 如果點擊的是當前已打開的回覆框，則關閉它
    if (activeReplyId === commentId) {
      setActiveReplyId(null);
      setCurrentReplyTo('');
    } else {
      // 否則打開新的回覆框，關閉之前的
      setActiveReplyId(commentId);
      setCurrentReplyTo(replyToName ? `@${replyToName} ` : '');
    }
  };

  return (
    <div>
      <div className={styles['y-all-comment-btn']}>
        <button onClick={toggleComments}>
          {isCollapsed
            ? `- 共${count}則留言 -`
            : `- 隱藏全部留言 -`}
        </button>
      </div>
      {
        !isCollapsed && (
          <>
            <div className={`${styles['y-sort-dropdown']} my-4`}>
              <select
                id="sort-comments"
                name="sort-comments"
                className="form-select"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="1">由新到舊</option>
                <option value="2">由舊到新</option>
                <option value="3">熱門留言</option>
              </select>
            </div>
            <div className="pt-3">
              {getSortedComments().map((comment) => (
                <ReplyItem
                  key={comment.id}
                  articleId={articleId}
                  commentId={comment.id}
                  userName={comment.nickname || comment.name}
                  userProfile={comment.head}
                  text={comment.content}
                  time={comment.created_at}
                  media_urls={comment.media_urls}
                  media_types={comment.media_types}
                  replies={comment.replies}
                  likeCount={comment.like_count}
                  activeMenuId={activeMenuId}
                  setActiveMenuId={setActiveMenuId}
                  is_edited={comment.is_edited}
                  updated_at={comment.updated_at}
                  currentEditingId={currentEditingId}
                  setCurrentEditingId={setCurrentEditingId}
                  onCommentDeleted={handleCommentDeleted}
                  isAuthenticated={isAuthenticated} // 添加這行
                  showAuthModal={showAuthModal} // 添加這行
                  activeReplyId={activeReplyId} // 新增
                  handleReplyClick={handleReplyClick} // 新增
                  currentReplyTo={activeReplyId === comment.id ? currentReplyTo : ''} // 新增
                  token={token} // 新增
                  userId={userId} // 新增
                />
              ))}
            </div>
          </>
        )
      }
    </div >
  )
}

