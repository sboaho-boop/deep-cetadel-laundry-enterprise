export default function Gallery() {
  return (
    <div className="py-12 bg-gray-100 px-6">
      <h2 className="text-3xl font-bold text-center mb-6">Gallery</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white h-40 rounded shadow"></div>
        <div className="bg-white h-40 rounded shadow"></div>
        <div className="bg-white h-40 rounded shadow"></div>
        <div className="bg-white h-40 rounded shadow"></div>
      </div>
    </div>
  );
}