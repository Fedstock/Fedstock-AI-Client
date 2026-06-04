export type WeatherInsight = {
  location: string;
  condition: string;
  temperature: string;
  message: string;
  checklist: string[];
};

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    precipitation_probability_max?: number[];
    weather_code?: number[];
  };
};

const STORE_LOCATION = {
  label: "서울특별시 동작구",
  latitude: 37.5124,
  longitude: 126.9393,
};

function getWeatherCondition(code: number) {
  if (code === 0) return "맑음";
  if ([1, 2, 3].includes(code)) return "구름";
  if ([45, 48].includes(code)) return "안개";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "비";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "눈";
  if ([95, 96, 99].includes(code)) return "뇌우";
  return "날씨";
}

function buildInsight(code: number, temperature: number, maxTemperature?: number, rainProbability?: number): Omit<WeatherInsight, "location" | "temperature"> {
  const condition = getWeatherCondition(code);
  const highTemperature = Math.max(temperature, maxTemperature ?? temperature);

  if (condition === "비" || condition === "뇌우" || (rainProbability ?? 0) >= 60) {
    return {
      condition: rainProbability ? `${condition} 가능성 ${Math.round(rainProbability)}%` : condition,
      message: "비 예보가 있어 매장 방문 전후의 간편 구매 수요가 늘 수 있습니다. 우산, 간편식, 즉석식, 실내 간식류를 먼저 확인하세요.",
      checklist: ["우산/우비", "즉석식", "간편식", "실내 간식류"],
    };
  }

  if (condition === "눈") {
    return {
      condition,
      message: "눈 예보가 있어 외출 전 비상 구매와 생활필수품 수요가 늘 수 있습니다. 즉석식, 생수, 생활용품 재고를 확인하세요.",
      checklist: ["즉석식", "생수", "생활용품", "방한 관련 상품"],
    };
  }

  if (highTemperature >= 30) {
    return {
      condition: `더움 · 최고 ${Math.round(highTemperature)}°C`,
      message: "기온이 높아 차가운 상품 수요가 늘 수 있습니다. 아이스크림, 얼음, 냉장 음료, 냉장 간편식을 먼저 확인하세요.",
      checklist: ["아이스크림", "얼음", "냉장 음료", "냉장 간편식"],
    };
  }

  if (temperature <= 0) {
    return {
      condition: `한파 · 현재 ${Math.round(temperature)}°C`,
      message: "기온이 낮아 따뜻한 먹거리와 생활필수품 수요가 늘 수 있습니다. 온장 식품, 즉석식, 따뜻한 음료를 확인하세요.",
      checklist: ["온장 식품", "즉석식", "따뜻한 음료", "생활필수품"],
    };
  }

  if (condition === "맑음") {
    return {
      condition,
      message: "맑은 날씨라 외출 수요가 늘 수 있습니다. 아이스크림, 차가운 음료, 간식류 판매 흐름을 먼저 확인하세요.",
      checklist: ["아이스크림", "차가운 음료", "간식류", "휴대 간편식"],
    };
  }

  return {
    condition,
    message: "날씨 변화가 크지 않은 날입니다. 상위 예상 판매 상품과 기본 간편식 재고를 중심으로 확인하세요.",
    checklist: ["상위 예상 상품", "간편식", "음료", "기본 생활용품"],
  };
}

export async function fetchWeatherInsight(signal?: AbortSignal): Promise<WeatherInsight> {
  const params = new URLSearchParams({
    latitude: String(STORE_LOCATION.latitude),
    longitude: String(STORE_LOCATION.longitude),
    current: "temperature_2m,weather_code",
    daily: "temperature_2m_max,precipitation_probability_max,weather_code",
    timezone: "Asia/Seoul",
    forecast_days: "1",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error("날씨 정보를 불러오지 못했습니다.");
  }

  const payload = await response.json() as OpenMeteoResponse;
  const temperature = payload.current?.temperature_2m;
  const code = payload.current?.weather_code ?? payload.daily?.weather_code?.[0];
  if (typeof temperature !== "number" || typeof code !== "number") {
    throw new Error("날씨 정보를 확인할 수 없습니다.");
  }

  const insight = buildInsight(
    code,
    temperature,
    payload.daily?.temperature_2m_max?.[0],
    payload.daily?.precipitation_probability_max?.[0],
  );

  return {
    ...insight,
    location: STORE_LOCATION.label,
    temperature: `${Math.round(temperature)}°C`,
  };
}
