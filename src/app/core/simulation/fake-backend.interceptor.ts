import { HttpErrorResponse, type HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { DestroyRef, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  MAX_RANGE_MS,
  type BucketId,
  type SeriesId,
  isBucketId,
  isSeriesId,
} from '../data/series.catalog';
import { toMeasurementsDto, toSeriesCatalogueDto } from './fake-backend.serializer';
import { SIMULATION_CONFIG } from './simulation.config';
import { SimulationClient } from './worker-client';

export const SIMULATION_CLIENT = new InjectionToken<SimulationClient>('SIMULATION_CLIENT', {
  providedIn: 'root',
  factory: () => {
    const client = new SimulationClient();
    inject(DestroyRef).onDestroy(() => client.dispose());
    return client;
  },
});

const API_PREFIX = '/api/';
const DAY_MS = 86_400_000;
const BUCKET_ALIASES: Readonly<Record<string, BucketId>> = { '1m': 'raw' };

class BadRequestError extends Error {}

function parseSeries(raw: string | null): SeriesId[] {
  const ids: SeriesId[] = [];
  const seen = new Set<SeriesId>();
  for (const value of (raw ?? '').split(',').filter(Boolean)) {
    if (!isSeriesId(value)) {
      throw new BadRequestError(`unknown series: ${value}`);
    }
    if (seen.has(value)) {
      throw new BadRequestError(`duplicate series: ${value}`);
    }
    seen.add(value);
    ids.push(value);
  }
  if (ids.length === 0) {
    throw new BadRequestError('series is required');
  }
  return ids;
}

function parseRange(from: string | null, to: string | null): { from: number; to: number } {
  const start = Date.parse(from ?? '');
  const end = Date.parse(to ?? '');
  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new BadRequestError('from and to are required ISO timestamps');
  }
  if (end <= start) {
    throw new BadRequestError('to must be later than from');
  }
  if (end - start > MAX_RANGE_MS) {
    throw new BadRequestError(`range must not exceed ${MAX_RANGE_MS / DAY_MS} days`);
  }
  return { from: start, to: end };
}

function parseBucket(raw: string | null): BucketId | undefined {
  if (raw === null) {
    return undefined;
  }
  const alias = BUCKET_ALIASES[raw];
  if (alias !== undefined) {
    return alias;
  }
  if (!isBucketId(raw)) {
    throw new BadRequestError(`unknown bucket: ${raw}`);
  }
  return raw;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const handle = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, ms);
    const abort = (): void => {
      clearTimeout(handle);
      reject(new Error('The request was aborted'));
    };
    signal.addEventListener('abort', abort, { once: true });
  });
}

export const fakeBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_PREFIX)) {
    return next(req);
  }

  const client = inject(SIMULATION_CLIENT);
  const latencyMs =
    SIMULATION_CONFIG.minLatencyMs +
    Math.random() * (SIMULATION_CONFIG.maxLatencyMs - SIMULATION_CONFIG.minLatencyMs);

  const respond = async (signal: AbortSignal): Promise<HttpResponse<unknown>> => {
    await sleep(latencyMs, signal);

    if (req.method !== 'GET') {
      throw new HttpErrorResponse({
        status: 405,
        statusText: 'Method Not Allowed',
        url: req.url,
      });
    }

    const path = req.url.split('?')[0];
    if (path === '/api/series') {
      return new HttpResponse({ status: 200, body: toSeriesCatalogueDto(), url: req.url });
    }

    if (path === '/api/measurements') {
      const generated = await client.series(
        {
          ...parseRange(req.params.get('from'), req.params.get('to')),
          series: parseSeries(req.params.get('series')),
          bucket: parseBucket(req.params.get('bucket')),
        },
        signal,
      );
      return new HttpResponse({
        status: 200,
        body: toMeasurementsDto(generated),
        url: req.url,
      });
    }

    throw new HttpErrorResponse({ status: 404, statusText: 'Not Found', url: req.url });
  };

  return new Observable<HttpResponse<unknown>>((subscriber) => {
    const controller = new AbortController();
    void respond(controller.signal).then(
      (response) => {
        if (!subscriber.closed) {
          subscriber.next(response);
          subscriber.complete();
        }
      },
      (error: unknown) => {
        if (controller.signal.aborted || subscriber.closed) {
          return;
        }
        if (error instanceof HttpErrorResponse) {
          subscriber.error(error);
          return;
        }
        if (error instanceof BadRequestError) {
          subscriber.error(
            new HttpErrorResponse({ status: 400, statusText: error.message, url: req.url }),
          );
          return;
        }
        subscriber.error(
          new HttpErrorResponse({
            status: 500,
            statusText: error instanceof Error ? error.message : 'Simulation failed',
            url: req.url,
          }),
        );
      },
    );
    return () => controller.abort();
  });
};
