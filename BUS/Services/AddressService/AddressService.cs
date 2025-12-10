using Common;
using DAT.Entity;
using DAT.UnitOfWork;
using DTO.DTO;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services.AddressService
{
    public class AddressService : IAddressService
    {
        private readonly IUnitOfWork _uow;

        public AddressService(IUnitOfWork unitOfWork)
        {
            _uow = unitOfWork;
        }

        public async Task<IEnumerable<AddressDTO>> GetAllForUserAsync(int userIdFromToken)
        {
            var entities = await _uow.Addresses.GetAllForUserAsync(userIdFromToken);
            return entities.Select(MapToDTO);
        }

        public async Task<AddressDTO?> GetByIdForUserAsync(int addressId, int userIdFromToken)
        {
            var entity = await _uow.Addresses.GetByIdForUserAsync(addressId, userIdFromToken);
            if (entity == null) return null;
            return MapToDTO(entity);
        }

        public async Task<AddressDTO> AddForUserAsync(AddressDTO dto, int userIdFromToken)
        {
            decimal lat = (decimal)dto.Latitude;
            decimal lng = (decimal)dto.Longitude;
            var fullAddress = dto.AdrsLine;

            if (lat == 0 && lng == 0)
            {
                var (geoLat, geoLng) = await GeoHelper.GetCoordinatesAsync(dto.AdrsLine);
                lat = geoLat;
                lng = geoLng;
            }

            // --- [LOGIC MỚI]: Xử lý Reset địa chỉ mặc định ---
            if (dto.IsDefault)
            {
                // 1. Lấy tất cả địa chỉ của user này
                var existingAddresses = await _uow.Addresses.GetAllForUserAsync(userIdFromToken);

                // 2. Tìm các địa chỉ đang là Default (nếu có) và set về false
                var currentDefaults = existingAddresses.Where(a => a.IsDefault == true).ToList();
                foreach (var addr in currentDefaults)
                {
                    addr.IsDefault = false;
                    _uow.Addresses.Update(addr); // Đánh dấu update
                }
            }
            // ------------------------------------------------

            var entity = new Address
            {
                UserID = userIdFromToken,
                AdrsCustomerName = dto.AdrsCustomerName,
                Phone = dto.Phone,
                AdrsLine = dto.AdrsLine,
                Latitude = lat,
                Longitude = lng,
                IsDefault = dto.IsDefault
            };

            await _uow.Addresses.AddAsync(entity);
            await _uow.SaveChangesAsync(); // Lưu cả entity mới và các entity cũ vừa bị sửa

            dto.AdrsID = entity.AdrsID;
            dto.Latitude = lat;
            dto.Longitude = lng;

            return MapToDTO(entity);
        }
        public async Task<bool> UpdateForUserAsync(int addressId, AddressDTO dto, int userIdFromToken)
        {
            var entity = await _uow.Addresses.GetByIdForUserAsync(addressId, userIdFromToken);
            if (entity == null)
                return false;

            if (dto.Latitude != 0 && dto.Longitude != 0)
            {
                // Ưu tiên lấy từ Frontend gửi lên
                entity.Latitude = (decimal)dto.Latitude;
                entity.Longitude = (decimal)dto.Longitude;
            }
            else if (entity.AdrsLine != dto.AdrsLine)
            {
                // Nếu Frontend không gửi tọa độ, nhưng địa chỉ text thay đổi -> Tự tính lại
                var (newLat, newLng) = await GeoHelper.GetCoordinatesAsync(dto.AdrsLine);
                entity.Latitude = newLat;
                entity.Longitude = newLng;
            }

            // --- Xử lý Reset địa chỉ mặc định ---
            if (dto.IsDefault)
            {
                var existingAddresses = await _uow.Addresses.GetAllForUserAsync(userIdFromToken);

                // Lấy các địa chỉ khác đang là Default
                var otherDefaults = existingAddresses
                                    .Where(a => a.AdrsID != addressId && a.IsDefault == true)
                                    .ToList();

                foreach (var addr in otherDefaults)
                {
                    addr.IsDefault = false;
                    _uow.Addresses.Update(addr);
                }
            }

            // Cập nhật thông tin địa chỉ chính
            entity.AdrsCustomerName = dto.AdrsCustomerName;
            entity.AdrsLine = dto.AdrsLine;
            entity.Phone = dto.Phone;
            entity.IsDefault = dto.IsDefault;

            var (finalLat, finalLng) = await GeoHelper.GetCoordinatesAsync(dto.AdrsLine);
            entity.Latitude = finalLat;
            entity.Longitude = finalLng;

            _uow.Addresses.Update(entity);

            try
            {
                await _uow.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                bool isFatalError = false;

                foreach (var entry in ex.Entries)
                {
                    if (entry.Entity is Address addrEntry)
                    {
                        if (addrEntry.AdrsID == addressId)
                        {
                            isFatalError = true;
                        }
                        else
                        {
                            entry.State = EntityState.Detached;
                        }
                    }
                }

                if (isFatalError) return false;

                await _uow.SaveChangesAsync();
            }

            return true;
        }
        public async Task<bool> DeleteForUserAsync(int addressId, int userIdFromToken)
        {
            var entity = await _uow.Addresses.GetByIdForUserAsync(addressId, userIdFromToken);
            if (entity == null)
                return false; // Không tìm thấy (hoặc cố xóa của người khác)

            _uow.Addresses.Remove(entity);
            await _uow.SaveChangesAsync();
            return true;
        }

        private AddressDTO MapToDTO(Address a)
        {
            return new AddressDTO
            {
                AdrsID = a.AdrsID,
                AdrsCustomerName = a.AdrsCustomerName,
                AdrsLine = a.AdrsLine,
                Phone = a.Phone,
                IsDefault = a.IsDefault.GetValueOrDefault() // Xử lý 'bit' (bool?)
            };
        }
    }
}
