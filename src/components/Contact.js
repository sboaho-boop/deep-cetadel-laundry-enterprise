export default function Contact() {
  return (
    <div className="py-10 bg-gray-100 text-center">
      <h2 className="text-3xl font-bold mb-6">Contact / Book a Service</h2>

      <form className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        <input className="p-3 border rounded" placeholder="Your Name" />
        <input className="p-3 border rounded" placeholder="Your Email" />
        <input className="p-3 border rounded" placeholder="Service" />
        <input className="p-3 border rounded" type="date" />
        <textarea className="p-3 border rounded md:col-span-2" placeholder="Message"></textarea>

        <button className="bg-blue-600 text-white p-3 rounded md:col-span-2">
          Send Booking
        </button>
      </form>

      <a
        href="https://wa.me/233552686955"
        className="inline-block bg-green-600 text-white px-6 py-3 rounded mt-4"
      >
        Book via WhatsApp
      </a>
    </div>
  );
}