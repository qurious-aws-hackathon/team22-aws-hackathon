import React, { useState, useEffect, useCallback } from 'react';
import { Spot, api } from '../api';
import VerifiedBadge from './VerifiedBadge';
import Confirm from './Confirm';
import { useLoading } from '../contexts/LoadingContext';

interface PlaceDetailPopupProps {
  spotId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSpotDelete?: (spotId: string) => void;
  onAlert?: (type: 'success' | 'error', message: string) => void;
}

const PlaceDetailPopup: React.FC<PlaceDetailPopupProps> = ({
  spotId,
  isOpen,
  onClose,
  onSpotDelete,
  onAlert
}) => {
  const [currentSpot, setCurrentSpot] = useState<Spot | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const currentUser = api.auth.getCurrentUser();
  const { withLoading } = useLoading();

  useEffect(() => {
    if (spotId && isOpen) {
      loadSpotDetails(spotId);
      loadComments(spotId);
      loadUserReaction(spotId);
    } else {
      setCurrentSpot(null);
      setComments([]);
      setCommentInput('');
      setUserReaction(null);
    }
  }, [spotId, isOpen]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen, onClose]);

  const loadSpotDetails = async (id: string) => {
    try {
      setIsLoading(true);
      const spotDetail = await api.spots.getSpot(id);
      setCurrentSpot(spotDetail);
    } catch (error) {
      console.error('Spot 정보 조회 실패:', error);
      onAlert?.('error', '장소 정보를 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadComments = async (id: string) => {
    try {
      const commentsData = await api.comments.getComments({ spot_id: id, limit: 10 });
      setComments(commentsData);
    } catch (error) {
      console.error('댓글 로딩 실패:', error);
    }
  };

  const loadUserReaction = async (id: string) => {
    try {
      const { userReaction } = await api.spots.getReactionStatus(id);
      setUserReaction(userReaction);
    } catch (error) {
      console.error('반응 상태 확인 실패:', error);
    }
  };

  const handleLike = useCallback(async () => {
    if (!currentSpot) return;
    try {
      const response = await api.spots.likeSpot(currentSpot.id);

      // 로컬 상태만 업데이트 (전체 재조회 없이)
      setCurrentSpot(prev => prev ? {
        ...prev,
        like_count: response.likes,
        dislike_count: response.dislikes
      } : null);

      setUserReaction(response.userReaction || null);
    } catch (error) {
      onAlert?.('error', '좋아요 처리에 실패했습니다.');
    }
  }, [currentSpot, onAlert]);

  const handleDislike = useCallback(async () => {
    if (!currentSpot) return;
    try {
      const response = await api.spots.dislikeSpot(currentSpot.id);

      // 로컬 상태만 업데이트 (전체 재조회 없이)
      setCurrentSpot(prev => prev ? {
        ...prev,
        like_count: response.likes,
        dislike_count: response.dislikes
      } : null);

      setUserReaction(response.userReaction || null);
    } catch (error) {
      onAlert?.('error', '싫어요 처리에 실패했습니다.');
    }
  }, [currentSpot, onAlert]);

  const handleDelete = useCallback(() => {
    if (!currentSpot) return;
    setShowConfirm(true);
  }, [currentSpot]);

  const handleConfirmDelete = useCallback(async () => {
    if (!currentSpot) return;

    // 1. Confirm 모달과 상세 모달 닫기
    setShowConfirm(false);
    onClose();

    try {
      // 2. LoadingContext를 사용한 삭제 처리
      await withLoading(async () => {
        const result = await api.spots.deleteSpot(currentSpot.id);
        if (result.success) {
          // 3. 지도에서 spot 제거
          onSpotDelete?.(currentSpot.id);
          // 4. 성공 알림
          onAlert?.('success', '장소가 성공적으로 삭제되었습니다.');
        } else {
          onAlert?.('error', result.message || '장소 삭제에 실패했습니다.');
        }
      }, '장소를 삭제하는 중입니다...');
    } catch (error) {
      console.error('Delete error:', error);
      onAlert?.('error', '장소 삭제에 실패했습니다.');
    }
  }, [currentSpot, onAlert, onSpotDelete, onClose, withLoading]);

  const handleAddComment = useCallback(async () => {
    if (!currentSpot || !currentUser || !commentInput.trim()) return;

    try {
      await api.comments.createComment({
        spot_id: currentSpot.id,
        content: commentInput.trim(),
        user_id: currentUser.id,
        nickname: currentUser.nickname
      });
      setCommentInput('');
      loadComments(currentSpot.id);
    } catch (error) {
      onAlert?.('error', '댓글 등록에 실패했습니다.');
    }
  }, [currentSpot, currentUser, commentInput, onAlert]);

  if (!isOpen) return null;

  const canDelete = currentUser && currentSpot && (currentSpot.user_id === currentUser.id || currentSpot.user_id === 'anonymous');

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 9998,
          backdropFilter: 'blur(2px)'
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Popup */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '420px',
          maxWidth: '90vw',
          maxHeight: '85vh',
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: '1px solid #e0e0e0',
          zIndex: 9999,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>장소 상세 정보</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              fontSize: '16px',
              cursor: 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1
        }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              로딩 중...
            </div>
          ) : !currentSpot ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              장소 정보를 불러올 수 없습니다.
            </div>
          ) : (
            <>
              {/* Title and Delete */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#333' }}>
                    {currentSpot.name}
                  </h2>
                  {currentSpot.is_noise_recorded && (
                    <VerifiedBadge size="medium" />
                  )}
                </div>
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    style={{
                      background: '#ff4757',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      color: 'white',
                      padding: '6px 12px',
                      fontWeight: 500
                    }}
                  >
                    삭제
                  </button>
                )}
              </div>

              {/* Image */}
              {currentSpot.image_url && (
                <div style={{ marginBottom: '20px' }}>
                  <img
                    src={currentSpot.image_url}
                    alt={currentSpot.name}
                    style={{
                      width: '100%',
                      height: '220px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      border: '1px solid #e0e0e0'
                    }}
                  />
                </div>
              )}

              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <div style={{
                  padding: '12px',
                  background: '#f8f9fa',
                  borderRadius: '10px',
                  textAlign: 'center',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>🔊</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#495057' }}>
                    {currentSpot.noise_level}dB
                  </div>
                  <div style={{ fontSize: '11px', color: '#6c757d' }}>
                    {currentSpot.is_noise_recorded ? '실측' : '예상'}
                  </div>
                </div>
                <div style={{
                  padding: '12px',
                  background: '#f8f9fa',
                  borderRadius: '10px',
                  textAlign: 'center',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>⭐</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#495057' }}>
                    {currentSpot.rating}/5
                  </div>
                  <div style={{ fontSize: '11px', color: '#6c757d' }}>평점</div>
                </div>
                <div style={{
                  padding: '12px',
                  background: '#f8f9fa',
                  borderRadius: '10px',
                  textAlign: 'center',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>🤫</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#495057' }}>
                    {currentSpot.quiet_rating}/100
                  </div>
                  <div style={{ fontSize: '11px', color: '#6c757d' }}>조용함</div>
                </div>
              </div>

              {/* Reactions */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <button
                  onClick={handleLike}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    background: userReaction === 'like' ? '#e8f5e9' : 'white',
                    color: userReaction === 'like' ? '#2e7d32' : '#6B7280',
                    borderColor: userReaction === 'like' ? '#4caf50' : '#e0e0e0',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'all 0.2s ease'
                  }}
                >
                  👍 좋아요 ({currentSpot.like_count || 0})
                </button>
                <button
                  onClick={handleDislike}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    background: userReaction === 'dislike' ? '#ffebee' : 'white',
                    color: userReaction === 'dislike' ? '#d32f2f' : '#6B7280',
                    borderColor: userReaction === 'dislike' ? '#f44336' : '#e0e0e0',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'all 0.2s ease'
                  }}
                >
                  👎 싫어요 ({currentSpot.dislike_count || 0})
                </button>
              </div>

              {/* Description */}
              <div style={{
                padding: '16px',
                background: '#f8f9fa',
                borderRadius: '12px',
                fontSize: '14px',
                color: '#555',
                marginBottom: '24px',
                lineHeight: '1.5',
                border: '1px solid #e9ecef'
              }}>
                {currentSpot.description}
              </div>

              {/* Comments Section */}
              <div>
                <h4 style={{
                  margin: '0 0 16px 0',
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#333',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  💬 댓글 ({comments.length})
                </h4>

                {/* Comment Input */}
                {currentUser ? (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      fontSize: '13px',
                      color: '#666',
                      marginBottom: '8px',
                      fontWeight: 500
                    }}>
                      👤 {currentUser.nickname}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="댓글을 입력하세요..."
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                        style={{
                          flex: 1,
                          padding: '12px',
                          border: '2px solid #e9ecef',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'border-color 0.2s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#667eea'}
                        onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={!commentInput.trim()}
                        style={{
                          padding: '12px 20px',
                          border: 'none',
                          borderRadius: '8px',
                          background: commentInput.trim() ? '#667eea' : '#ccc',
                          color: 'white',
                          cursor: commentInput.trim() ? 'pointer' : 'not-allowed',
                          fontSize: '14px',
                          fontWeight: 600,
                          transition: 'background 0.2s ease'
                        }}
                      >
                        등록
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '16px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '14px',
                    color: '#666',
                    marginBottom: '16px',
                    border: '1px solid #e9ecef'
                  }}>
                    댓글을 작성하려면 로그인이 필요합니다.
                  </div>
                )}

                {/* Comments List */}
                <div style={{
                  border: '1px solid #e9ecef',
                  borderRadius: '12px',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {comments.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      color: '#999',
                      padding: '40px 20px',
                      fontSize: '14px'
                    }}>
                      첫 번째 댓글을 남겨보세요! 🎉
                    </div>
                  ) : (
                    comments.map((comment, index) => (
                      <div key={comment.id} style={{
                        padding: '16px',
                        borderBottom: index < comments.length - 1 ? '1px solid #f0f0f0' : 'none',
                        wordWrap: 'break-word'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}>
                          <span style={{
                            fontWeight: 600,
                            fontSize: '14px',
                            color: '#333'
                          }}>
                            {comment.nickname || '익명'}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            color: '#999'
                          }}>
                            {new Date(comment.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: '#555',
                          lineHeight: '1.4'
                        }}>
                          {comment.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      <Confirm
        isOpen={showConfirm}
        title="장소 삭제"
        message="정말로 이 장소를 삭제하시겠습니까? 삭제된 장소는 복구할 수 없습니다."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirm(false)}
        confirmText="삭제"
        cancelText="취소"
      />
    </>
  );
};

export default PlaceDetailPopup;
