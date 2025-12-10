using BUS.Services.PaymentService;
using Microsoft.AspNetCore.Mvc;

namespace WebAPI.Controllers
{
    [Route("api/admin/payments")]
    [ApiController]
    public class AdminPaymentController : ControllerBase
    {
        private readonly IPaymentService _service;

        public AdminPaymentController(IPaymentService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllForAdminAsync();
            return Ok(result);
        }
    }
}
