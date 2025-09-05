import { useState, useEffect } from 'react';
import { type Spot, type Comment, api } from '../api';
import { getScoreColor, getScoreText, getScoreEmoji } from '../utils';
import { useLoading } from '../contexts/LoadingContext';

interface PlaceDetailPanelProps {
  spot: Spot;
  onClose: () => void;
  position?: { x: number; y: number };
}

const PlaceDetailPanel: React.FC<PlaceDetailPanelProps> = ({ spot, onClose, position }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [nickname, setNickname] = useState('');
  const [likeCount, setLikeCount] = useState(spot.like_count || 0);
  const [dislikeCount, setDislikeCount] = useState(spot.dislike_count || 0);
  const { withLoading } = useLoading();

  useEffect(() => {
    loadComments();
  }, [spot.id]);

  const loadComments = async () => {
    try {
      const commentsData = await api.comments.getComments({ 
        spot_id: spot.id,
        limit: 10
      });
      setComments(commentsData);
    } catch (error) {
      console.error('댓글 로딩 실패:', error);
    }
  };

  const handleLike = async () => {
    try {
      const response = await withLoading(
        () => api.spots.likeSpot(spot.id),
        '좋아요 처리 중...'
      );
      setLikeCount(response.likes);
      setDislikeCount(response.dislikes);
    } catch (error) {
      console.error('좋아요 실패:', error);
    }
  };

  const handleDislike = async () => {
    try {
      const response = await withLoading(
        () => api.spots.dislikeSpot(spot.id),
        '싫어요 처리 중...'
      );
      setLikeCount(response.likes);
      setDislikeCount(response.dislikes);
    } catch (error) {
      console.error('싫어요 실패:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !nickname.trim()) return;
    
    try {
      await withLoading(async () => {
        await api.comments.createComment({
          spot_id: spot.id,
          content: newComment.trim(),
          nickname: nickname.trim()
        });
        await loadComments();
      }, '댓글 등록 중...');
      
      setNewComment('');
    } catch (error) {
      console.error('댓글 등록 실패:', error);
    }
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    width: '350px',
    maxHeight: '80vh',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    border: '2px solid #667eea',
    zIndex: 10000,
    overflow: 'hidden',
    ...(position ? {
      left: position.x - 175,
      top: position.y - 20,
      transform: 'none'
    } : {
      top: '20px',
      right: '20px'
    })
  };

  return (
    <div style={panelStyle}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        borderBottom: '1px solid #eee'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>장소 상세</h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ maxHeight: 'calc(80vh - 60px)', overflowY: 'auto' }}>
        {/* 사진 영역 */}
        {spot.image_url && (
          <div style={{ width: '100%', height: '200px', overflow: 'hidden' }}>
            <img
              src={spot.image_url}
              alt={spot.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>
        )}

        {/* 제목 */}
        <div style={{ padding: '16px' }}>
          <h2 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '20px', 
            fontWeight: '700',
            color: '#333'
          }}>
            {spot.name}
          </h2>

          {/* 좋아요/싫어요/소음도 */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
            alignItems: 'center'
          }}>
            <button
              onClick={handleLike}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: '20px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              👍 {likeCount}
            </button>
            
            <button
              onClick={handleDislike}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: '20px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              👎 {dislikeCount}
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 12px',
              backgroundColor: getScoreColor(spot.quiet_rating),
              borderRadius: '20px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              🔊 {spot.noise_level}dB
              {spot.is_noise_recorded && <span style={{ marginLeft: '4px' }}>⭐</span>}
            </div>
          </div>

          {/* 내용 */}
          {spot.description && (
            <div style={{
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#555'
            }}>
              {spot.description}
            </div>
          )}

          {/* 댓글 섹션 */}
          <div>
            <h4 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '16px', 
              fontWeight: '600',
              color: '#333'
            }}>
              댓글 ({comments.length})
            </h4>

            {/* 댓글 입력 */}
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="닉네임"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  marginBottom: '8px'
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="댓글을 입력하세요..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || !nickname.trim()}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    background: (!newComment.trim() || !nickname.trim()) ? '#ccc' : '#667eea',
                    color: 'white',
                    cursor: (!newComment.trim() || !nickname.trim()) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  등록
                </button>
              </div>
            </div>

            {/* 댓글 목록 */}
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #eee',
              borderRadius: '8px'
            }}>
              {comments.length === 0 ? (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#999',
                  fontSize: '14px'
                }}>
                  첫 번째 댓글을 남겨보세요!
                </div>
              ) : (
                comments.map((comment, index) => (
                  <div
                    key={comment.id}
                    style={{
                      padding: '12px',
                      borderBottom: index < comments.length - 1 ? '1px solid #f0f0f0' : 'none'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#333'
                      }}>
                        {comment.nickname || '익명'}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        color: '#999'
                      }}>
                        {new Date(comment.created_at).toLocaleDateString()}
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
        </div>
      </div>
    </div>
  );
};

export default PlaceDetailPanel;
