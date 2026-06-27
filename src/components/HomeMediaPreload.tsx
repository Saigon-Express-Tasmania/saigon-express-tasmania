/** Preload hero media on the home page only (not every route). */
export default function HomeMediaPreload() {
  return (
    <>
      <link
        rel="preload"
        href="/images/intro-cover.jpg"
        as="image"
        type="image/jpeg"
        fetchPriority="high"
      />
    </>
  );
}
