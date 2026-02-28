import { FaTshirt, FaBroom, FaTint, FaTruck, FaSoap } from "react-icons/fa";

export default function Services() {
  const services = [
    { name: "Wash & Fold", icon: FaSoap },
    { name: "Dry Cleaning", icon: FaBroom },
    { name: "Ironing", icon: FaTshirt },
    { name: "Stain Removal", icon: FaTint },
    { name: "Pickup & Delivery", icon: FaTruck },
  ];

  return (
    <div className="py-12 bg-gray-50">
      <h2 className="text-3xl font-bold text-center mb-8">Our Services</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 px-6">
        {services.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition transform hover:scale-105 text-center"
            >
              <Icon className="text-3xl mb-2 text-blue-600 mx-auto" />
              <h3 className="font-bold text-blue-700">{s.name}</h3>
            </div>
          );
        })}
      </div>
    </div>
  );
}