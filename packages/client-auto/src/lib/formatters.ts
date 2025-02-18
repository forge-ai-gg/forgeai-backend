type FormatCurrencyOptions = Intl.NumberFormatOptions & {
    isCents?: boolean;
    showSign?: boolean;
};

// format a number as a currency
export const formatCurrency = (
    amount: number,
    options: FormatCurrencyOptions = {}
): string => {
    const { currency = "USD", ...numberFormatOptions } = options;

    const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
        currencyDisplay: "narrowSymbol",
        useGrouping: true,
        ...numberFormatOptions,
    }).format(Math.abs(options.isCents ? amount / 100 : amount));

    return amount < 0
        ? `(${formatted})`
        : `${options.showSign ? "+" : ""}${formatted}`;
};

export function formatPercent(
    percent?: string | number,
    options: Intl.NumberFormatOptions = {
        style: "percent",
        maximumFractionDigits: 2,
    }
): string | undefined {
    if (percent === undefined) {
        return undefined;
    }

    const percentNumber =
        typeof percent === "string" ? parseFloat(percent) : percent;

    const { ...numberFormatOptions } = options;

    const computedValue = percentNumber * 100;

    const formattedValue = new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 10,
        useGrouping: true,
        ...numberFormatOptions,
    }).format(computedValue);

    return formattedValue;
}

export const formatDate = (date: Date) => new Date(date).toLocaleDateString();

export function formatNumber(
    value?: string | number,
    options: Intl.NumberFormatOptions = {
        maximumFractionDigits: 2,
    }
): string | undefined {
    if (value === undefined) {
        return undefined;
    }

    const numberValue = typeof value === "string" ? parseFloat(value) : value;

    return new Intl.NumberFormat(undefined, {
        useGrouping: true,
        ...options,
    }).format(numberValue);
}
