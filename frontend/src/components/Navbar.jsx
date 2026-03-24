import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

const Navbar = () => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  const businessStr = localStorage.getItem('business');
  const business = businessStr ? JSON.parse(businessStr) : null;

  const navigate = useNavigate();

  const handleLogout = () => {
    console.log("Logging out...");
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('business');
    navigate('/login');
    window.location.reload();
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <span className="font-black text-xl text-white italic">F</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">Finexa</span>
          </Link>

          <div className="flex items-center gap-6 ml-8">
            <Link to="/dashboard" className="text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors">Dashboard</Link>
            <Link to="/analysis" className="text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors">Trend Analysis</Link>
            <Link to="/anomaly" className="text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors text-red-500">Anomaly (ML)</Link>
          </div>

          <div className="flex-1"></div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end text-right">
                  <span className="text-sm font-bold text-gray-800">{user?.name || "User"}</span>
                  {business && (
                    <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest leading-tight">
                      {business?.businessName || "Business"}
                    </span>
                  )}
                </div>
                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                  <User size={20} />
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Log Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition-colors">Log In</Link>
                <Link 
                  to="/signup" 
                  className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
