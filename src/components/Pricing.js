export default function Pricing() {
  return (
    <div className="py-10 text-center">
      <h2 className="text-3xl font-bold mb-6">Pricing</h2>

      <div className="grid md:grid-cols-4 gap-6 px-10">
        <div className="bg-blue-600 text-white p-6 rounded-lg shadow">Wash & Fold<br/>GHS 5 per kg</div>
        <div className="bg-blue-600 text-white p-6 rounded-lg shadow">Dry Cleaning<br/>GHS 15 per item</div>
        <div className="bg-blue-600 text-white p-6 rounded-lg shadow">Ironing<br/>GHS 2 per item</div>
        <div className="bg-blue-600 text-white p-6 rounded-lg shadow">Pickup & Delivery<br/>GHS 5 within city</div>
      </div>
    </div>
  );
}