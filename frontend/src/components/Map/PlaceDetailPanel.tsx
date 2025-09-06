import React, { useState, useEffect, useCallback } from 'react';
import { Spot, api } from '../../api';

interface PlaceDetailPanelProps {
  spot: Spot | null;
  onClose: () => void;
  onSpotDelete?: (spotId: string) => void;
  onAlert?: (type: 'success' | 'error', message: string) => void;
}

const PlaceDetailPanel: React.FC<PlaceDetailPanelProps> = ({
  spot,
  onClose,
  onSpotDelete,
  onAlert
}) => {
  const [currentSpot, setCurrentSpot] = useState<Spot | null>(spot);
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(null);

  const currentUser = api.auth.getCurrentUser();

  useEffect(() => {
    if (spot) {
      loadSpotDetails(spot.id);
      loadComments(spot.id);
      loadUserReaction(spot.id);
    }
  }, [spot]);

  const loadSpotDetails = async (spotId: string) => {
    try {
      const spotDetail = await api.spots.getSpot(spotId);
      setCurrentSpot(spotDetail);
    } catch (error) {
      console.error('Spot 정보 조회 실패:', error);
    }
  };

  const loadComments = async (spotId: string) => {
    try {
      const commentsData = await api.comments.getComments({ spot_id: spotId, limit: 5 });
      setComments(commentsData);
    } catch (error) {
      console.error('댓글 로딩 실패:', error);
    }
  };

  const loadUserReaction = async (spotId: string) => {
    try {
      const { userReaction } = await api.spots.getReactionStatus(spotId);
      setUserReaction(userReaction);
    } catch (error) {
      console.error('반응 상태 확인 실패:', error);
    }
  };

  const handleLike = useCallback(async () => {
    if (!currentSpot) return;
    try {
      await api.spots.likeSpot(currentSpot.id);
      loadSpotDetails(currentSpot.id);
      loadUserReaction(currentSpot.id);
    } catch (error) {
      onAlert?.('error', '좋아요 처리에 실패했습니다.');
    }
  }, [currentSpot, onAlert]);

  const handleDislike = useCallback(async () => {
    if (!currentSpot) return;
    try {
      await api.spots.dislikeSpot(currentSpot.id);
      loadSpotDetails(currentSpot.id);
      loadUserReaction(currentSpot.id);
    } catch (error) {
      onAlert?.('error', '싫어요 처리에 실패했습니다.');
    }
  }, [currentSpot, onAlert]);

  const handleDelete = useCallback(async () => {
    if (!currentSpot || !confirm('정말로 이 장소를 삭제하시겠습니까?')) return;
    
    try {
      const result = await api.spots.deleteSpot(currentSpot.id);
      if (result.success) {
        onAlert?.('success', '장소가 성공적으로 삭제되었습니다.');
        onSpotDelete?.(currentSpot.id);
        onClose();
      } else {
        onAlert?.('error', result.message || '장소 삭제에 실패했습니다.');
      }
    } catch (error) {
      onAlert?.('error', '장소 삭제에 실패했습니다.');
    }
  }, [currentSpot, onAlert, onSpotDelete, onClose]);

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

  if (!currentSpot) return null;

  const canDelete = currentUser && (currentSpot.user_id === currentUser.id || currentSpot.user_id === 'anonymous');

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '360px',
      width: '350px',
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      border: '2px solid #667eea',
      padding: '16px',
      zIndex: 1000,
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>장소 상세</h3>
        <button 
          onClick={onClose}
          style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}
        >
          ✕
        </button>
      </div>

      {/* Title and Delete */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#333', flex: 1 }}>
          {currentSpot.name}
        </h2>
        {canDelete && (
          <button 
            onClick={handleDelete}
            style={{ 
              background: '#ff4757', 
              border: 'none', 
              borderRadius: '4px', 
              fontSize: '12px', 
              cursor: 'pointer', 
              color: 'white', 
              padding: '4px 8px', 
              fontWeight: 500 
            }}
          >
            삭제
          </button>
        )}
      </div>

      {/* Image */}
      {currentSpot.image_url && (
        <div style={{ marginBottom: '16px' }}>
          <img 
            src={currentSpot.image_url} 
            alt={currentSpot.name} 
            style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e0e0e0' }}
          />
        </div>
      )}

      {/* Reactions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <button 
          onClick={handleLike}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #e0e0e0', 
            borderRadius: '20px', 
            background: userReaction === 'like' ? '#F3F4F6' : 'white',
            color: userReaction === 'like' ? '#8B5CF6' : '#6B7280',
            borderColor: userReaction === 'like' ? '#8B5CF6' : '#e0e0e0',
            cursor: 'pointer', 
            fontSize: '14px',
            fontWeight: userReaction === 'like' ? 'bold' : 'normal'
          }}
        >
          👍 {currentSpot.like_count || 0}
        </button>
        <button 
          onClick={handleDislike}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #e0e0e0', 
            borderRadius: '20px', 
            background: userReaction === 'dislike' ? '#F3F4F6' : 'white',
            color: userReaction === 'dislike' ? '#8B5CF6' : '#6B7280',
            borderColor: userReaction === 'dislike' ? '#8B5CF6' : '#e0e0e0',
            cursor: 'pointer', 
            fontSize: '14px',
            fontWeight: userReaction === 'dislike' ? 'bold' : 'normal'
          }}
        >
          👎 {currentSpot.dislike_count || 0}
        </button>
        <span style={{ padding: '8px 12px', background: '#667eea', borderRadius: '20px', color: 'white', fontSize: '14px' }}>
          🔊 {currentSpot.noise_level}dB {currentSpot.is_noise_recorded ? '⭐' : ''}
        </span>
      </div>

      {/* Description */}
      <div style={{ 
        padding: '12px', 
        background: '#f8f9fa', 
        borderRadius: '8px', 
        fontSize: '14px', 
        color: '#555', 
        marginBottom: '16px',
        wordBreak: 'break-all',
        whiteSpace: 'normal'
      }}>
        {currentSpot.description}
      </div>

      {/* Comments Section */}
      <div>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#333' }}>댓글</h4>
        
        {/* Comment Input */}
        {currentUser ? (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
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
                  padding: '8px', 
                  border: '1px solid #ddd', 
                  borderRadius: '6px', 
                  fontSize: '14px' 
                }}
              />
              <button 
                onClick={handleAddComment}
                style={{ 
                  padding: '8px 16px', 
                  border: 'none', 
                  borderRadius: '6px', 
                  background: '#667eea', 
                  color: 'white', 
                  cursor: 'pointer', 
                  fontSize: '14px' 
                }}
              >
                등록
              </button>
            </div>
          </div>
        ) : (
          <div style={{ 
            padding: '12px', 
            background: '#f8f9fa', 
            borderRadius: '6px', 
            textAlign: 'center', 
            fontSize: '14px', 
            color: '#666', 
            marginBottom: '12px' 
          }}>
            댓글을 작성하려면 로그인이 필요합니다.
          </div>
        )}

        {/* Comments List */}
        <div style={{ 
          border: '1px solid #eee', 
          borderRadius: '8px', 
          maxHeight: '174px', 
          overflowY: 'auto', 
          padding: '8px', 
          fontSize: '14px', 
          color: '#666' 
        }}>
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999' }}>첫 번째 댓글을 남겨보세요!</div>
          ) : (
            comments.map(comment => (
              <div key={comment.id} style={{ 
                marginBottom: '6px', 
                padding: '8px 0', 
                borderBottom: '1px solid #f0f0f0',
                wordWrap: 'break-word'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>{comment.nickname || '익명'}</span>
                  <span style={{ fontSize: '12px', color: '#999' }}>
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#555', lineHeight: '1.3' }}>
                  {comment.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaceDetailPanel;
