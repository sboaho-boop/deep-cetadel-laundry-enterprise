const IMAGES = [
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952",
  "https://images.unsplash.com/photo-1545173168-9f1947eebb9f",
  "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60",
  "https://images.unsplash.com/photo-1489274495757-95c7c837b101",
  "https://images.unsplash.com/photo-1521656693084-3839ed0026e1",
  "https://images.unsplash.com/photo-1567113463300-102550123354",
  "https://images.unsplash.com/photo-1517677129300-07b130802f46",
  "https://images.unsplash.com/photo-1432462770865-65b70566d673"
];

export default function Gallery() {
  return (
    <section className="w-full py-2 bg-white">
      {/* Using 'flex-wrap' and 'justify-center' ensures the images 
          stay small and clustered in the middle like real objects.
      */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {IMAGES.map((src, index) => (
          <img 
            key={index}
            src={src} 
            alt="laundry detail"
            // w-6 h-6 is roughly 24px (The size of a shirt button)
            // This will NOT stretch because it is in a flex container
            className="w-6 h-6 object-cover rounded-[2px] grayscale opacity-40 hover:opacity-100 hover:grayscale-0 transition-all cursor-crosshair hover:scale-150"
          />
        ))}
      </div>
    </section>
  );
}