using BUS.Services.FileStorageService;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services.FileStorageService
{
    public class FileStorageService : IFileStorageService
    {
        private readonly IWebHostEnvironment _env;

        public FileStorageService(IWebHostEnvironment env)
        {
            _env = env;
        }

        public async Task<string> SaveFileAsync(IFormFile file)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("File không hợp lệ");

            // 1. Lấy đường dẫn thư mục hiện tại của WebAPI (nơi file .exe/.dll chạy)
            var currentDirectory = Directory.GetCurrentDirectory();

            // 2. Đi lùi ra thư mục cha (Solution folder)
            // Lưu ý: Tùy cấu trúc folder của bạn mà có thể cần Parent.Parent
            var solutionDirectory = Directory.GetParent(currentDirectory)?.FullName;

            // 3. Trỏ vào thư mục của Project GUI (Thay "GUI" bằng tên folder project giao diện của bạn)
            // Ví dụ: Project của bạn tên là "FastFoodClient" thì thay "GUI" thành "FastFoodClient"
            var targetFolder = Path.Combine(solutionDirectory, "GUI", "wwwroot", "images");

            // Tạo thư mục nếu chưa có
            if (!Directory.Exists(targetFolder))
            {
                Directory.CreateDirectory(targetFolder);
            }

            // 4. Các bước lưu file như cũ
            var fileExtension = Path.GetExtension(file.FileName);
            var uniqueFileName = $"{Guid.NewGuid()}{fileExtension}";
            var filePath = Path.Combine(targetFolder, uniqueFileName);

            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(fileStream);
            }

            return $"/images/{uniqueFileName}";
        }
        public void DeleteFile(string fileName)
        {
            // fileName dạng "/images/abc.jpg"
            if (string.IsNullOrEmpty(fileName)) return;

            var relativePath = fileName.TrimStart('/');
            var filePath = Path.Combine(_env.WebRootPath, relativePath);

            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }
        }
    }
}
