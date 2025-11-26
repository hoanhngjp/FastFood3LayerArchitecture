using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Common
{
    public static class GeoHelper
    {
        // Tính tọa độ hiện tại dựa trên phần trăm quãng đường đã đi (0.0 -> 1.0)
        public static (decimal lat, decimal lng) Interpolate(decimal startLat, decimal startLng, decimal endLat, decimal endLng, double percent)
        {
            // Giới hạn percent trong khoảng 0 - 1
            percent = Math.Max(0, Math.Min(1, percent));

            decimal lat = startLat + (endLat - startLat) * (decimal)percent;
            decimal lng = startLng + (endLng - startLng) * (decimal)percent;

            return (lat, lng);
        }

        // (Tùy chọn) Tính khoảng cách để trừ pin chính xác hơn
        public static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            // Công thức Haversine đơn giản (trả về KM)
            var R = 6371;
            var dLat = (lat2 - lat1) * (Math.PI / 180);
            var dLon = (lon2 - lon1) * (Math.PI / 180);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(lat1 * (Math.PI / 180)) * Math.Cos(lat2 * (Math.PI / 180)) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return R * c;
        }
    }
}
