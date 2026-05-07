document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem('token');
   
    if (!token) {
       window.location.href = '/';
      // window.location.href = '/admin';
    }
  
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.href = '/';
    });

});mai