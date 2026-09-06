export default function StarRating({ rating, size = 16 }) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<span key={i} className="star filled" style={{ fontSize: size }}>&#9733;</span>);
    } else if (i === fullStars && hasHalf) {
      stars.push(<span key={i} className="star half" style={{ fontSize: size }}>&#9733;</span>);
    } else {
      stars.push(<span key={i} className="star empty" style={{ fontSize: size }}>&#9733;</span>);
    }
  }

  return (
    <span className="star-rating">
      {stars}
      <span className="rating-value">{rating.toFixed(1)}</span>
    </span>
  );
}
