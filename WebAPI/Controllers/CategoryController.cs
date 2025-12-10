using BUS.Services;
using DTO.DTO;
using DTO.DTO.Category;
using Microsoft.AspNetCore.Mvc;

namespace WebAPI.Controllers
{
    [ApiController]
    [Route("categories")]
    public class CategoryController : ControllerBase
    {
        private readonly ICategoryService _service;

        public CategoryController(ICategoryService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll() => Ok(await _service.GetAllAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var c = await _service.GetByIdAsync(id);
            if (c == null)
                return NotFound(new { message = $"Không tìm thấy category với ID: {id}" });
            return Ok(c);
        }

        [HttpPost]
        public async Task<IActionResult> Add([FromBody] CreateCategoryDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var newCategory = await _service.AddAsync(dto);

            // SỬA: Trả về 201 CreatedAtAction (chuẩn REST)
            return CreatedAtAction(nameof(GetById), new { id = newCategory.CategoryId }, newCategory);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateCategoryDTO dto)
        {
            if (id != dto.CategoryId)
                return BadRequest(new { message = "ID trong URL không khớp với ID trong body" });

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _service.UpdateAsync(id, dto);

            if (!result)
                return NotFound(new { message = $"Không tìm thấy category với ID: {id} để cập nhật" });

            // Trả về 204 NoContent
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);
            if (!result)
                return NotFound(new { message = $"Không tìm thấy category với ID: {id} để xóa" });

            // Trả về 204 NoContent
            return NoContent();
        }
    }

}
