using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO.User
{
    // DTO trả về danh sách có phân trang
    public class PagedResult<T>
    {
        public IEnumerable<T> Items { get; set; }
        public int TotalCount { get; set; }
        public int PageIndex { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    }

    // DTO để nhận tham số lọc từ Client
    public class UserFilterRequest
    {
        public string? Keyword { get; set; } // Tìm theo Tên hoặc Email
        public string? Role { get; set; }    // Lọc theo Role (Admin, Manager...)
        public int PageIndex { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    // DTO đơn giản cho Dropdown Role
    public class RoleDTO
    {
        public int RoleID { get; set; }
        public string RoleName { get; set; }
    }
}
