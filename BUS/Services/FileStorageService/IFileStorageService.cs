using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services.FileStorageService
{
    public interface IFileStorageService
    {
        Task<string> SaveFileAsync(IFormFile file);
        void DeleteFile(string fileName);
    }
}
