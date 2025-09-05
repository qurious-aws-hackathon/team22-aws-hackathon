interface TopBarProps {
  spotsCount: number;
}

const TopBar: React.FC<TopBarProps> = ({ spotsCount }) => {
  return (
    <header className="top-bar">
      <div className="top-bar-content">
        <h1>🤫 쉿플레이스</h1>
        <p>조용하고 한적한 곳을 찾아보세요</p>
        <span className="spots-count">📍 총 {spotsCount}개 장소</span>
      </div>
    </header>
  );
};

export default TopBar;
