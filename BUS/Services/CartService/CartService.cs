using DAT.UnitOfWork;
using DTO.DTO.Cart;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace BUS.Services.CartService
{
    public class CartService : ICartService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private const string CART_SESSION_KEY = "CartSession";

        public CartService(IUnitOfWork unitOfWork, IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        // Helper: Lấy Session từ HttpContext
        private ISession _session => _httpContextAccessor.HttpContext.Session;

        public async Task<List<CartItemDTO>> GetCartAsync()
        {
            var sessionData = _session.GetString(CART_SESSION_KEY);
            if (string.IsNullOrEmpty(sessionData))
            {
                return new List<CartItemDTO>();
            }
            return JsonSerializer.Deserialize<List<CartItemDTO>>(sessionData);
        }

        public async Task AddToCartAsync(int foodId, int quantity)
        {
            var cart = await GetCartAsync();
            var existingItem = cart.FirstOrDefault(x => x.FoodID == foodId);

            if (existingItem != null)
            {
                // Nếu món đã có, chỉ cộng dồn số lượng
                existingItem.Quantity += quantity;
            }
            else
            {
                // Nếu món chưa có, lấy thông tin từ DB và thêm mới
                var food = await _unitOfWork.FoodItems.GetByIdAsync(foodId);
                if (food == null) throw new KeyNotFoundException("Món ăn không tồn tại!");

                var newItem = new CartItemDTO
                {
                    FoodID = food.FoodID,
                    FoodName = food.FoodName,
                    Price = food.Price,
                    ImageURL = food.ImageURL,
                    Quantity = quantity
                };
                cart.Add(newItem);
            }

            SaveCartToSession(cart);
        }

        public async Task UpdateQuantityAsync(int foodId, int quantity)
        {
            var cart = await GetCartAsync();
            var item = cart.FirstOrDefault(x => x.FoodID == foodId);

            if (item != null)
            {
                if (quantity > 0)
                {
                    item.Quantity = quantity;
                }
                else
                {
                    // Nếu update số lượng <= 0 thì xóa luôn
                    cart.Remove(item);
                }
                SaveCartToSession(cart);
            }
        }

        public async Task RemoveFromCartAsync(int foodId)
        {
            var cart = await GetCartAsync();
            var item = cart.FirstOrDefault(x => x.FoodID == foodId);
            if (item != null)
            {
                cart.Remove(item);
                SaveCartToSession(cart);
            }
        }

        public Task ClearCartAsync()
        {
            _session.Remove(CART_SESSION_KEY);
            return Task.CompletedTask;
        }

        // Helper: Lưu ngược list vào Session
        private void SaveCartToSession(List<CartItemDTO> cart)
        {
            var json = JsonSerializer.Serialize(cart);
            _session.SetString(CART_SESSION_KEY, json);
        }
    }
}
