using Microsoft.AspNetCore.Mvc;

namespace GUI.Controllers
{
    public class RestaurantController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Orders()
        {
            return View();
        }

        public IActionResult OrderDetail(int id)
        {
            
            return View();
        }
    }
}
