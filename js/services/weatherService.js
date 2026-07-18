/* Smart Alarm Pro - Weather Service (Open-Meteo Integration) */

export const WeatherService = {
  // Map Open-Meteo code to standard text and SVG icons
  getConditionByCode(code) {
    const mappings = {
      0: { label: 'Clear Sky', icon: 'sun' },
      1: { label: 'Mainly Clear', icon: 'cloud-sun' },
      2: { label: 'Partly Cloudy', icon: 'cloud' },
      3: { label: 'Overcast', icon: 'cloud' },
      45: { label: 'Foggy', icon: 'wind' },
      48: { label: 'Depositing Rime Fog', icon: 'wind' },
      51: { label: 'Light Drizzle', icon: 'cloud-rain' },
      53: { label: 'Moderate Drizzle', icon: 'cloud-rain' },
      55: { label: 'Dense Drizzle', icon: 'cloud-rain' },
      61: { label: 'Slight Rain', icon: 'cloud-rain' },
      63: { label: 'Moderate Rain', icon: 'cloud-rain' },
      65: { label: 'Heavy Rain', icon: 'cloud-showers-heavy' },
      71: { label: 'Slight Snowfall', icon: 'snowflake' },
      73: { label: 'Moderate Snowfall', icon: 'snowflake' },
      75: { label: 'Heavy Snowfall', icon: 'snowflake' },
      80: { label: 'Slight Rain Showers', icon: 'cloud-rain' },
      81: { label: 'Moderate Rain Showers', icon: 'cloud-rain' },
      82: { label: 'Violent Rain Showers', icon: 'cloud-showers-heavy' },
      95: { label: 'Thunderstorm', icon: 'cloud-lightning' }
    };
    return mappings[code] || { label: 'Cloudy', icon: 'cloud' };
  },

  async fetchWeather(latitude, longitude) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=sunrise,sunset&timezone=auto`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Weather data fetch failed');
      
      const data = await response.json();
      
      const current = data.current;
      const daily = data.daily;
      const condition = this.getConditionByCode(current.weather_code);
      
      // Parse sunrise/sunset times
      const formatTime = (timeStr) => {
        const d = new Date(timeStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      };

      return {
        temp: Math.round(current.temperature_2m),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        conditionText: condition.label,
        iconName: condition.icon,
        sunrise: daily ? formatTime(daily.sunrise[0]) : '--:--',
        sunset: daily ? formatTime(daily.sunset[0]) : '--:--',
      };
    } catch (error) {
      console.error('Error loading weather data:', error);
      throw error;
    }
  },

  getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        { timeout: 8000 }
      );
    });
  }
};
