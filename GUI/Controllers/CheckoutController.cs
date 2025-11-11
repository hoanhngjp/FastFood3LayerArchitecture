using Microsoft.AspNetCore.Mvc;

namespace GUI.Controllers
{
    public class CheckoutController : Controller
    {
        
        public IActionResult Index()
        {
            // View nằm trong Views/Admin/Checkout/Checkout.cshtml
            return View("~/Views/Checkout/Checkout.cshtml");
        }

        public IActionResult Success()
        {
            return View("~/Views/Checkout/Success.cshtml");
        }
    }
}
