import * as THREE from 'three';




const dimensions = { 'x': 'longitude', 'y': 'depth', 'z': 'latitude', 't': 'time' };

class Common {
    constructor() {

        // this.regionData = {
        //     rsea: {
        //         water_salinity: { min: 35, max: 41, tmin: 35, tmax: 45, unit: 'psu', v: 'psal', name: 'Salinity' },
        //         water_temperature: { min: 5, max: 31, tmin: 5, tmax: 35, unit: '°C', v: 'potemp', name: 'Temperature' },
        //         meshscale: [2, 0.4, 2],
        //         datapath: "/iap/data_repo/forecasts/regions/rsea/ocean/mitgcm_multiples/{folder}12/{date}_hm-KAUST-OCEAN-RSMP-ARG-b{prev}_FC01-fv02.00.nc"
        //     },
        //     argf: {
        //         water_salinity: { min: 34, max: 50, tmin: 34, tmax: 60, unit: 'psu', v: 'psal', name: 'Salinity' },
        //         water_temperature: { min: 14, max: 28, tmin: 14, tmax: 50, unit: '°C', v: 'potemp', name: 'Temperature' },
        //         meshscale: [1.7*1.5, 0.4, 1.7],
        //         datapath: "/iap/data_repo/forecasts/regions/argf/ocean/mitgcm_multiples/{folder}12/{date}_hm-KAUST-OCEAN-RSMP-ARG-b{prev}_FC01-fv02.00.nc"
        //     }
        // };

        // this.region = localStorage.getItem('Region_for_3D') ? localStorage.getItem('Region_for_3D') : 'rsea';
        // this.vdate = localStorage.getItem('Date_for_3D') ? new Date(localStorage.getItem('Date_for_3D')) : this.formatDate(new Date());
        // this.variable = localStorage.getItem('Variable_for_3D') ? localStorage.getItem('Variable_for_3D') : 'water_salinity';
        // console.log(`Region: ${this.region}, Date: ${this.vdate}, Variable: ${this.variable}`);

        // this.parameters = this.regionData[this.region][this.variable];

        this.meshscale = [1.7*1.5, 0.4, 1.7];

        // this.dates = [];

        // this.folder = this.prevDate(this.vdate);

        // for (let i = 0; i < 8; i++) {
        //     const d = new Date(this.vdate);
        //     d.setDate(d.getDate() + i);
        //     this.dates.push(this.formatDate(d));
        // }

        this.time = [];

        this.config_url_pre = 'config';
        this.config_url = {
            init: `${this.config_url_pre}/dust_dimensions`,
            legend: `${this.config_url_pre}/legend`,
            colorTable: `${this.config_url_pre}/colortable`,
        };

        this.data_url_pre = 'data';
        this.data_url = {
            init: `${this.data_url_pre}/dust_dimensions`,
            dust: `${this.data_url_pre}/dust`,
            wind: `${this.data_url_pre}/wind`,
        };

        this.lengend = {
            width: 256 * 15, height: 256 * 10, middle: 100, c: 256 * 1, font_size: 170, sprite: undefined
        };

        // this.colors = new Float32Array([
        //     1.0, 0.0, 0.0,
        //     1.0, 0.5, 0.0,
        //     1.0, 1.0, 0.0,
        //     0.5, 1.0, 0.0,
        //     0.0, 1.0, 0.0,
        //     0.0, 1.0, 0.5,
        //     0.0, 1.0, 1.0,
        //     0.0, 0.0, 1.0,
        //     0.5, 0.0, 1.0,
        //     1.0, 0.0, 1.0
        // ]);
    }

    // async loadSliceTexture(url) {
    //     const response = await fetch(url, {
    //         method: "POST",
    //         headers: {
    //             "Content-Type": "application/json",
    //         },
    //         body: JSON.stringify(this.parameters),
    //     });
    //     const data = await response.arrayBuffer();
    //     return new Uint8Array(data);
    // }

    async loadDustTexture() {
        const response = await fetch(this.data_url.dust, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                task: 0,
                time: 0,
            }),
        });
        const data = await response.arrayBuffer();
        const uint16Data = new Uint16Array(data);
        const float32Data = this.float16ToFloat32(uint16Data);
        return float32Data;
    }

    async loadUVW() {
        const response = await fetch(this.data_url.uvw, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(this.parameters),
        });
        const data = await response.json();
        // const data = await response.arrayBuffer();
        // console.log(data);
        // console.log(data.length);
        // return new Float32Array(data);
        return data;
    }

    // async loadVolumeTextureT() {
    //     const response = await fetch(this.data_url.xyzt, {
    //         method: "POST",
    //         headers: {
    //             "Content-Type": "application/json",
    //         },
    //         body: JSON.stringify(this.parameters),
    //     });
    //     const data = await response.arrayBuffer();
    //     // const data = await response.json();
    //     return new Float32Array(data);
    // }

    async loadColorTableTexture() {
        let response = await fetch(this.config_url.colorTable);
        let data = await response.arrayBuffer();
        return new Uint8Array(data);
    }

    // formatDate(date) {
    //     const year = date.getFullYear();
    //     const month = String(date.getMonth() + 1).padStart(2, "0");
    //     const day = String(date.getDate()).padStart(2, "0");
    //     return `${year}-${month}-${day}`;
    // }

    // formatDateNoDash(date) {
    //     const year = date.getFullYear();
    //     const month = String(date.getMonth() + 1).padStart(2, "0");
    //     const day = String(date.getDate()).padStart(2, "0");
    //     return `${year}${month}${day}`;
    // }

    // prevDate(date) {
    //     const d = new Date(date);
    //     d.setDate(d.getDate() - 1);
    //     return this.formatDateNoDash(d);
    // }

    // path(v, t) {
    //     console.log('Constructing data path:');
    //     // console.log(this.regionData[this.region].datapath.replace('{folder}', this.folder).replace('{date}', this.formatDateNoDash(this.vdate)).replace('{prev}', this.prevDate(this.vdate)));
    //     // return '/home/cuiw0b/Documents/Projects/redsea3d/app/data/20250911_hm-KAUST-OCEAN-RSMP-ARG-b20250910_FC01-fv02.00.nc';
    //     // return '/home/cuiw0b/Documents/Projects/redsea3d/app/data/20251215_hm-KAUST-OCEAN-RSMP-ARG-b20251214_FC01-fv02.00.nc';
    //     if (v === "DUST") {

    //         return '/home/cuiw0b/Documents/Projects/redsea3d/app/data/20250911_hm-KAUST-OCEAN-RSMP-ARG-b20250910_FC01-fv02.00.nc';
    //     } else if (v === "UVEL" || v === "VVEL" || v === "WVEL") {
    //         return '/home/cuiw0b/Documents/Projects/redsea3d/app/data/20251215_hm-KAUST-OCEAN-RSMP-ARG-b20251214_FC01-fv02.00.nc';
    //     }
    //     return this.regionData[this.region].datapath.replace('{folder}', this.folder).replace('{date}', this.formatDateNoDash(this.vdate)).replace('{prev}', this.prevDate(this.vdate));
    // }

    async init() {
        const respone = await fetch(this.data_url.init, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });
        const data = await respone.json();

        console.log(data);

        this.dust_dimensions = data;

        // this.parameters.xn = data[0].length;
        // this.parameters.yn = data[1].length;
        // this.parameters.zn = data[2].length;
        // this.parameters.tn = data[3].length;
        // this.ui_parameters.longitude_max = data[0].length - 1;
        // this.ui_parameters.depth_max = data[1].length - 1;
        // this.ui_parameters.latitude_max = data[2].length - 1;
    }

    async loadLegendSprite() {
        // const parameters = JSON.parse(JSON.stringify(this.parameters));
        // if (parameters.v == 'uvel' || parameters.v == 'vvel' || parameters.v == 'wvel') {
        //     parameters.min = parameters.min - 5;
        //     parameters.max = parameters.max - 5;
        // }
        console.log('Loading legend sprite with parameters:');
        console.log(this.parameters);
        const response = await fetch(this.config_url.legend, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                min: this.parameters.min,
                max: this.parameters.max,
                v: this.parameters.v,
            }),
        });
        const data = await response.json();
        return data;
        // return this.createSprite(data);
    }

    createSprite(data) {
        const canvas = document.createElement('canvas');
        canvas.width = this.lengend.width;
        canvas.height = this.lengend.height + this.lengend.font_size;
        const context = canvas.getContext('2d');
        const gradient = context.createLinearGradient(0, this.lengend.font_size / 2, 0, this.lengend.height + this.lengend.font_size / 2);
        for (let i = 0; i < data.length; i++) {
            gradient.addColorStop(data[i][0], data[i][2]);
        }
        context.fillStyle = gradient;
        context.fillRect(0, this.lengend.font_size / 2, this.lengend.c, this.lengend.height + this.lengend.font_size / 2);
        context.fillStyle = '#ffffff';
        context.font = `${this.lengend.font_size}px Arial`;
        for (let i = 0; i < data.length; i++) {
            context.fillText(data[i][1], this.lengend.c + this.lengend.middle, (1 - data[i][0]) * this.lengend.height + this.lengend.font_size);
        }
        let texture = new THREE.CanvasTexture(canvas);
        texture.generateMipmaps = false;
        if (this.lengend.sprite != undefined) {
            this.lengend.sprite.material.map = texture;
            this.lengend.sprite.material.map.needsUpdate = true;
            return this.lengend.sprite;
        }
        this.lengend.sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: texture
        }));
        this.lengend.sprite.material.map.colorSpace = THREE.SRGBColorSpace;
        this.lengend.sprite.scale.x = 0.5;
        this.lengend.sprite.scale.y = 0.5;
        return this.lengend.sprite;
    }

    normalize(t, min, max) {
        if (t > max) return 1;
        if (t < min) return 0;
        return (t - min) / (max - min);
    }

    normalizedIndex(arr, x) {
        let closestIndex = arr.reduce((bestIndex, curr, index) =>
            Math.abs(curr - x) < Math.abs(arr[bestIndex] - x) ? index : bestIndex, 0
        );
        // let normalizedIndex = closestIndex / (arr.length - 1);
        return closestIndex / (arr.length - 1);
    }

    float16ToFloat32(uint16Array) {
        // Use a library or implement conversion
        // Here is a simple implementation using DataView
        const float32Array = new Float32Array(uint16Array.length);
        for (let i = 0; i < uint16Array.length; i++) {
            float32Array[i] = this.decodeFloat16(uint16Array[i]);
        }
        return float32Array;
    }

    decodeFloat16(binary) {
        const s = (binary & 0x8000) >> 15;
        const e = (binary & 0x7C00) >> 10;
        const f = binary & 0x03FF;
        if (e === 0) {
            return (s ? -1 : 1) * Math.pow(2, -14) * (f / Math.pow(2, 10));
        }
        if (e === 0x1F) {
            return f ? NaN : ((s ? -1 : 1) * Infinity);
        }
        return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + (f / Math.pow(2, 10)));
    }
}

export default Common;