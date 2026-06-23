import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  fetchDeliveryCityOptions,
  type DeliveryCityOption,
} from '@/lib/delivery-cities';
import { useEffect, useId, useMemo, useState } from 'react';
import { DeliveryCitySelect } from './DeliveryCitySelect';
import {
  calculateSelfDeliveryFee,
  clampStep,
  formatAudAmount,
  type SelfDeliveryFee,
} from './selfDeliveryFee';

type SelfDeliveryFeeCardProps = {
  value: SelfDeliveryFee;
  onChange: (next: SelfDeliveryFee) => void;
  disabled?: boolean;
};

type SliderNumberFieldProps = {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  formatValue?: (value: number) => string;
};

function formatDefault(value: number): string {
  return String(value);
}

function SliderNumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  disabled = false,
  formatValue = formatDefault,
}: SliderNumberFieldProps) {
  const [draft, setDraft] = useState(formatValue(value));

  useEffect(() => {
    setDraft(formatValue(value));
  }, [formatValue, value]);

  const commitDraft = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(formatValue(value));
      return;
    }
    onChange(clampStep(parsed, min, max, step));
  };

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) =>
            onChange(clampStep(Number(event.target.value), min, max, step))
          }
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Input
          type="number"
          min={min}
          max={max}
          step={step}
          value={draft}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
          }}
          className="h-8 w-16 shrink-0 px-2 text-xs"
          aria-label={`${label} value`}
        />
      </div>
    </div>
  );
}

export function SelfDeliveryFeeCard({
  value,
  onChange,
  disabled = false,
}: SelfDeliveryFeeCardProps) {
  const gasPriceId = useId();
  const simulationCityId = useId();
  const simulationDistanceId = useId();
  const [simulationDistanceKm, setSimulationDistanceKm] = useState('15');
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [deliveryCities, setDeliveryCities] = useState<DeliveryCityOption[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [citiesError, setCitiesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCities() {
      setCitiesLoading(true);
      setCitiesError(null);
      try {
        const cities = await fetchDeliveryCityOptions();
        if (!cancelled) {
          setDeliveryCities(cities);
        }
      } catch (err) {
        if (!cancelled) {
          setDeliveryCities([]);
          setCitiesError(
            err instanceof Error ? err.message : 'Failed to load delivery cities.',
          );
        }
      } finally {
        if (!cancelled) {
          setCitiesLoading(false);
        }
      }
    }

    void loadCities();
    return () => {
      cancelled = true;
    };
  }, []);

  const parsedSimulationDistance = Number(simulationDistanceKm);
  const quote = useMemo(
    () =>
      Number.isFinite(parsedSimulationDistance) && parsedSimulationDistance >= 0
        ? calculateSelfDeliveryFee(value, parsedSimulationDistance)
        : null,
    [parsedSimulationDistance, value],
  );

  const setField = <K extends keyof SelfDeliveryFee>(
    key: K,
    fieldValue: SelfDeliveryFee[K],
  ) => {
    onChange({ ...value, [key]: fieldValue });
  };

  const handleCitySelect = (city: DeliveryCityOption) => {
    setSelectedCityId(city.id);
    if (city.distanceKm != null && Number.isFinite(city.distanceKm)) {
      setSimulationDistanceKm(String(city.distanceKm));
    }
  };

  const handleDistanceChange = (nextDistance: string) => {
    setSimulationDistanceKm(nextDistance);
    setSelectedCityId(null);
  };

  return (
    <Card size="sm" className="flex-shrink-0">
      <CardHeader className="pb-0">
        <CardTitle>Self Delivery Fee</CardTitle>
        <CardDescription className="text-xs">
          <code>self_delivery_fee</code> — in-house delivery pricing inputs.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-1.5">
            <Label htmlFor={gasPriceId} className="text-xs font-medium">
              Gas price (per liter)
            </Label>
            <Input
              id={gasPriceId}
              type="number"
              min="0"
              step="0.01"
              value={value.gas_price}
              disabled={disabled}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                if (Number.isFinite(parsed) && parsed >= 0) {
                  setField('gas_price', parsed);
                }
              }}
              className="h-8 max-w-[7rem] px-2 text-xs"
            />
          </div>

          <SliderNumberField
            id="self-delivery-truck-engine-volume"
            label="Truck engine volume (L)"
            value={value.truck_engine_volume}
            onChange={(next) => setField('truck_engine_volume', next)}
            min={1}
            max={8}
            step={0.5}
            disabled={disabled}
            formatValue={(next) => next.toFixed(1)}
          />

          <SliderNumberField
            id="self-delivery-maintenance-buffer"
            label="Maintenance buffer (%)"
            value={value.maintenance_buffer}
            onChange={(next) => setField('maintenance_buffer', next)}
            min={0}
            max={100}
            step={1}
            disabled={disabled}
          />

          <SliderNumberField
            id="self-delivery-profit-margin"
            label="Profit margin (%)"
            value={value.profit_margin}
            onChange={(next) => setField('profit_margin', next)}
            min={0}
            max={200}
            step={1}
            disabled={disabled}
          />
        </div>

        <Separator className="my-4" />

        <div className="flex flex-wrap items-end gap-4">
          <div className="grid min-w-[220px] flex-1 gap-1.5">
            <Label htmlFor={simulationCityId} className="text-xs font-medium">
              Delivery city
            </Label>
            <DeliveryCitySelect
              id={simulationCityId}
              options={deliveryCities}
              selectedId={selectedCityId}
              disabled={disabled}
              loading={citiesLoading}
              onSelect={handleCitySelect}
              onClear={() => setSelectedCityId(null)}
            />
            {citiesError ? (
              <p className="text-xs text-destructive">{citiesError}</p>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={simulationDistanceId} className="text-xs font-medium">
              Simulation distance (one way, km)
            </Label>
            <Input
              id={simulationDistanceId}
              type="number"
              min="0"
              step="0.1"
              value={simulationDistanceKm}
              disabled={disabled}
              onChange={(event) => handleDistanceChange(event.target.value)}
              className="h-8 w-28 px-2 text-xs"
            />
          </div>

          {quote ? (
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground">Estimated delivery fee</p>
              <p className="text-lg font-semibold tabular-nums">
                {formatAudAmount(quote.totalFee)}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Enter a valid distance.</p>
          )}
        </div>

        {quote ? (
          <dl className="mt-3 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex justify-between gap-2 sm:block">
              <dt className="text-muted-foreground">Round trip</dt>
              <dd className="tabular-nums sm:text-right">
                {quote.roundTripDistanceKm.toFixed(1)} km
              </dd>
            </div>
            <div className="flex justify-between gap-2 sm:block">
              <dt className="text-muted-foreground">Est. efficiency</dt>
              <dd className="tabular-nums sm:text-right">
                {quote.efficiencyKmPerLiter.toFixed(1)} km/L
              </dd>
            </div>
            <div className="flex justify-between gap-2 sm:block">
              <dt className="text-muted-foreground">Fuel cost</dt>
              <dd className="tabular-nums sm:text-right">
                {formatAudAmount(quote.fuelCost)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 sm:block">
              <dt className="text-muted-foreground">
                Maintenance ({value.maintenance_buffer}%)
              </dt>
              <dd className="tabular-nums sm:text-right">
                {formatAudAmount(quote.maintenanceCost)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 sm:block">
              <dt className="text-muted-foreground">Before margin</dt>
              <dd className="tabular-nums sm:text-right">
                {formatAudAmount(quote.subtotalBeforeMargin)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 sm:block">
              <dt className="text-muted-foreground">
                Profit margin ({value.profit_margin}%)
              </dt>
              <dd className="tabular-nums sm:text-right">
                {formatAudAmount(quote.totalFee - quote.subtotalBeforeMargin)}
              </dd>
            </div>
          </dl>
        ) : null}
      </CardContent>
    </Card>
  );
}
