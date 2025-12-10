using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Globalization;

namespace Common
{
    public static class GeoHelper
    {
        // HttpClient static là đúng, nhưng không được sửa DefaultRequestHeaders lúc runtime
        private static readonly HttpClient _httpClient = new HttpClient();

        // 1. TÍNH TỌA ĐỘ NỘI SUY (Dùng cho DroneSimulatorWorker)
        public static (decimal lat, decimal lng) Interpolate(decimal startLat, decimal startLng, decimal endLat, decimal endLng, double percent)
        {
            percent = Math.Max(0, Math.Min(1, percent));

            decimal lat = startLat + (endLat - startLat) * (decimal)percent;
            decimal lng = startLng + (endLng - startLng) * (decimal)percent;

            return (lat, lng);
        }

        // 2. TÍNH KHOẢNG CÁCH (Haversine) - Đã đổi sang decimal để tiện dùng với Entity
        public static double CalculateDistance(decimal lat1, decimal lon1, decimal lat2, decimal lon2)
        {
            double r = 6371; // Bán kính trái đất km
            double dLat = ToRadians((double)(lat2 - lat1));
            double dLon = ToRadians((double)(lon2 - lon1));

            double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                       Math.Cos(ToRadians((double)lat1)) * Math.Cos(ToRadians((double)lat2)) *
                       Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

            double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return r * c;
        }

        private static double ToRadians(double angle)
        {
            return Math.PI * angle / 180.0;
        }

        // 3. GEOCODING (Lấy tọa độ từ địa chỉ) - Đã sửa Thread-Safe
        public static async Task<(decimal Lat, decimal Lng)> GetCoordinatesAsync(string address)
        {
            // Fallback mặc định: Dinh Độc Lập
            var defaultCoords = (10.7769m, 106.6951m);

            if (string.IsNullOrWhiteSpace(address)) return defaultCoords;

            try
            {
                var url = $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(address)}&format=json&limit=1&countrycodes=vn";

                // SỬA LỖI: Tạo Request Message riêng biệt cho mỗi lần gọi
                var request = new HttpRequestMessage(HttpMethod.Get, url);

                // Nominatim bắt buộc User-Agent
                request.Headers.Add("User-Agent", "FastFoodApp/1.0 (contact@example.com)");

                var response = await _httpClient.SendAsync(request);

                if (response.IsSuccessStatusCode)
                {
                    var resultList = await response.Content.ReadFromJsonAsync<List<NominatimResult>>();

                    if (resultList != null && resultList.Count > 0)
                    {
                        var result = resultList[0];
                        bool latParsed = decimal.TryParse(result.Lat, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal lat);
                        bool lonParsed = decimal.TryParse(result.Lon, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal lon);

                        if (latParsed && lonParsed) return (lat, lon);
                    }
                    else
                    {
                        Console.WriteLine($"[GEO WARNING] Không tìm thấy tọa độ cho: {address}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GEO ERROR] Lỗi gọi API: {ex.Message}");
            }

            return defaultCoords;
        }

        // Class nội bộ để map JSON
        private class NominatimResult
        {
            [JsonPropertyName("lat")]
            public string Lat { get; set; }
            [JsonPropertyName("lon")]
            public string Lon { get; set; }
        }
    }
}