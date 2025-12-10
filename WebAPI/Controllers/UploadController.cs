using BUS.Services.FileStorageService;
using Microsoft.AspNetCore.Mvc;

namespace WebAPI.Controllers
{
    [Route("upload")]
    [ApiController]
    public class UploadController : ControllerBase
    {
        private readonly IFileStorageService _fileService;

        public UploadController(IFileStorageService fileService)
        {
            _fileService = fileService;
        }

        [HttpPost("image")]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            try
            {
                // Log ra Console của Visual Studio để bạn xem
                Console.WriteLine($"--- NHẬN REQUEST UPLOAD ---");

                if (file == null)
                {
                    Console.WriteLine("Lỗi: File bị null");
                    return BadRequest("Không nhận được file (file is null)");
                }

                Console.WriteLine($"Tên file: {file.FileName}, Dung lượng: {file.Length}");

                var imageUrl = await _fileService.SaveFileAsync(file);

                Console.WriteLine($"Upload thành công: {imageUrl}");
                return Ok(new { url = imageUrl });
            }
            catch (Exception ex)
            {
                // QUAN TRỌNG: In lỗi chi tiết ra cửa sổ Output của Visual Studio
                Console.WriteLine("----------- LỖI UPLOAD -----------");
                Console.WriteLine(ex.ToString());
                Console.WriteLine("----------------------------------");

                // Trả lỗi chi tiết về cho Frontend xem luôn
                return StatusCode(500, new { message = "Lỗi Server: " + ex.Message, detail = ex.ToString() });
            }
        }
    }
}
