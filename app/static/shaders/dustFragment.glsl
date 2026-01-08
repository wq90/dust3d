#define MAX_STEPS 512
precision highp float;
precision highp sampler3D;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

in vec3 vOrigin;
in vec3 vDirection;

out vec4 color;

uniform sampler3D dataTexture;
uniform sampler2D colorTexture;

uniform float tmin;
uniform float tmax;
uniform float steps;
uniform float alpha;

uniform vec3 clipMin;
uniform vec3 clipMax;

uniform vec3 cameraPos;
uniform vec3 lightPos;

uniform float vmin;
uniform float vmax;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec2 hitBox(vec3 orig, vec3 dir) {
    const vec3 box_min = vec3(-0.5);
    const vec3 box_max = vec3(0.5);
    vec3 inv_dir = 1.0 / dir;
    vec3 tmin_tmp = (box_min - orig) * inv_dir;
    vec3 tmax_tmp = (box_max - orig) * inv_dir;
    vec3 tmin = min(tmin_tmp, tmax_tmp);
    vec3 tmax = max(tmin_tmp, tmax_tmp);
    float t0 = max(tmin.x, max(tmin.y, tmin.z));
    float t1 = min(tmax.x, min(tmax.y, tmax.z));
    return vec2(t0, t1);
}

float sampleData(vec3 p) {
    p.x = 1.0 - p.x;
    p.y = pow(p.y, 0.65);
    return texture(dataTexture, p).r;
}

float normald(float d) {
    float nd = (d - vmin) / (vmax - vmin);
    if(nd > 1.0) {
        nd = 1.0;
    }
    if(nd < 0.0) {
        nd = -1.0;
    }
    return nd;
}

vec4 sampleColor(float value) {
    return texture(colorTexture, vec2(value, 0.5));
}

// void mip(vec2 bounds, float delta, vec3 p, vec3 rayDir) {
    // float density = 0.0;
    // for(float t = bounds.x; t < bounds.y; t += delta) {
    //     if(p.y > clipMax.y || p.x > clipMax.x || p.z > clipMax.z || p.y < clipMin.y || p.x < clipMin.x || p.z < clipMin.z) {
    //         p += rayDir * delta;
    //         continue;
    //     }
    //     float d = sampleData(p + 0.5);
    //     if(d >= vmin) {
    //         if(d >= tmin && d <= tmax) {
    //             d = normald(d);
    //             if(d >= density) {
    //                 density = d;
    //             }
    //         }
    //     }
    //     if(density >= 1.0) {
    //         break;
    //     }
    //     p += rayDir * delta;
    // }
    // color.rgb = sampleColor(density).rgb;
    // color.a = density * alpha;
void mip(vec2 bounds, float delta, vec3 p, vec3 rayDir) {
    vec4 acc = vec4(0.0);

    // float rayLength = max(bounds.y - bounds.x, 0.0);
    // float delta = rayLength / float(MAX_STEPS);

    for(int i = 0; i < MAX_STEPS; i++) {
        float t = bounds.x + float(i) * delta;
        if(t > bounds.y)
            break;

        if(any(greaterThan(p, clipMax)) || any(lessThan(p, clipMin))) {
            p += rayDir * delta;
            continue;
        }

        float d = sampleData(p + 0.5);

        if(d > vmin && d < vmax) {
            float nd = clamp((d - vmin) / (vmax - vmin), 0.0, 1.0);
            vec4 c = sampleColor(nd);
            float a = nd * alpha * 0.1;

            acc.rgb += (1.0 - acc.a) * c.rgb * a;
            acc.a += (1.0 - acc.a) * a;

            if(acc.a > 0.95)
                break;
        }

        p += rayDir * delta;
    }

    color = acc;
}

void main() {
    vec3 rayDir = normalize(vDirection);
    vec2 bounds = hitBox(vOrigin, rayDir);
    if(bounds.x > bounds.y)
        discard;
    bounds.x = max(bounds.x, 0.0);
    // vec3 p = vOrigin + bounds.x * rayDir;
    float jitter = hash(gl_FragCoord.xy);
    float rayLength = max(bounds.y - bounds.x, 0.0);
    float delta = rayLength / float(MAX_STEPS);
    vec3 p = vOrigin + (bounds.x + jitter * delta) * rayDir;
    // vec3 inc = 1.0 / abs(rayDir);
    // float delta = min(inc.x, min(inc.y, inc.z));
    // delta /= steps;
    mip(bounds, delta, p, rayDir);
    if(color.a == 0.0)
        discard;
}

// if(vism == 0.0) {
// isosurface(bounds, delta, p, rayDir);
// } else if(vism == 1.0) {
// mip(bounds, delta, p, rayDir);
// } else if(vism == 2.0) {
// eac(bounds, delta, p, rayDir);
// }

// void eac(vec2 bounds, float delta, vec3 p, vec3 rayDir) {
//     for(float t = bounds.x; t < bounds.y; t += delta) {
//         if(p.y > clipMax.y || p.x > clipMax.x || p.z > clipMax.z || p.y < clipMin.y || p.x < clipMin.x || p.z < clipMin.z) {
//             p += rayDir * delta;
//             continue;
//         }
//         float current_variable = sampleData(p + 0.5);
//         if(current_variable >= vmin) {
//             if(current_variable >= tmin && current_variable <= tmax) {
//                 float d = normald(current_variable);
//                 color.rgb += (1.0 - color.a) * sampleColor(d).rgb;
//                 color.a += (1.0 - color.a) * d;
//                 if(color.a >= 0.95) {
//                     break;
//                 }
//             }
//         }
//         p += rayDir * delta;
//     }
//     color.a *= alpha;
//     if(light) {
//         vec3 norm = normal(p + 0.5);
//         vec3 lightDir = normalize(lightPos - p);
//         vec3 viewDir = normalize(cameraPos - p);
//         vec3 reflectDir = reflect(-lightDir, norm);
//         float ambient = .7;
//                             // float diffuse = max(dot(norm, lightDir), .0);
//                             // float specular = pow(max(dot(viewDir, reflectDir), .0), 2.0);
//         float diffuse = abs(dot(norm, lightDir));
//         float specular = pow(abs(dot(viewDir, reflectDir)), 16.0);
//         color.rgb = (ambient + diffuse + specular) * color.rgb * vec3(1.0);
//     }
// }

// void isosurface(vec2 bounds, float delta, vec3 p, vec3 rayDir) {
//     for(float t = bounds.x; t < bounds.y; t += delta) {
//         if(p.y > clipMax.y || p.x > clipMax.x || p.z > clipMax.z || p.y < clipMin.y || p.x < clipMin.x || p.z < clipMin.z) {
//             p += rayDir * delta;
//             continue;
//         }
//         float d = sampleData(p + 0.5);
//         if(d > vmin) {
//             if(d >= tmin && d <= tmax) {
//                 color.a = 1. * alpha;
//                 if(light) {
//                     vec3 norm = normal(p + 0.5);
//                     vec3 lightDir = normalize(lightPos - p);
//                     vec3 viewDir = normalize(cameraPos - p);
//                     vec3 reflectDir = reflect(-lightDir, norm);
//                     float ambient = .7;
//                     float diffuse = abs(dot(norm, lightDir));
//                     float specular = pow(abs(dot(viewDir, reflectDir)), 16.0);
//                     color.rgb = (ambient + diffuse + specular) * sampleColor(normald(d)).rgb * vec3(1.0);
//                    break;
//                 }
//                 color.rgb = sampleColor(normald(d)).rgb;
//                 break;
//             }
//         }
//         p += rayDir * delta;
//     }
// }

// void mip(vec2 bounds, float delta, vec3 p, vec3 rayDir) {
//     float density = 0.0;
//     for(float t = bounds.x; t < bounds.y; t += delta) {
//         if(p.y > clipMax.y || p.x > clipMax.x || p.z > clipMax.z || p.y < clipMin.y || p.x < clipMin.x || p.z < clipMin.z) {
//             p += rayDir * delta;
//             continue;
//         }
//         float d = sampleData(p + 0.5);
//         if(d >= vmin) {
//             if(d >= tmin && d <= tmax) {
//                 d = normald(d);
//                 if(d >= density) {
//                     density = d;
//                 }
//             }
//         }
//         if(density >= 1.0) {
//             break;
//         }
//         p += rayDir * delta;
//     }
//     color.rgb = sampleColor(density).rgb;
//     color.a = density * alpha;
//     if(light) {
//         vec3 norm = normal(p + 0.5);
//         vec3 lightDir = normalize(lightPos - p);
//         vec3 viewDir = normalize(cameraPos - p);
//         vec3 reflectDir = reflect(-lightDir, norm);
//         float ambient = .7;
//         float diffuse = abs(dot(norm, lightDir));
//         float specular = pow(abs(dot(viewDir, reflectDir)), 16.0);
//         color.rgb = (ambient + diffuse + specular) * color.rgb * vec3(1.0);
//     }
// }

// #define epsilon .0001

// vec3 normal(vec3 p) {
//     if(p.x < epsilon)
//         return vec3(1.0, 0.0, 0.0);
//     if(p.y < epsilon)
//         return vec3(0.0, 1.0, 0.0);
//     if(p.z < epsilon)
//         return vec3(0.0, 0.0, 1.0);
//     if(p.x > 1.0 - epsilon)
//         return vec3(-1.0, 0.0, 0.0);
//     if(p.y > 1.0 - epsilon)
//         return vec3(0.0, -1.0, 0.0);
//     if(p.z > 1.0 - epsilon)
//         return vec3(0.0, 0.0, -1.0);

//     float stepSize = 0.01;
//     float dx = sampleData(p + vec3(stepSize, 0.0, 0.0)) - sampleData(p - vec3(stepSize, 0.0, 0.0));
//     float dy = sampleData(p + vec3(0.0, stepSize, 0.0)) - sampleData(p - vec3(0.0, stepSize, 0.0));
//     float dz = sampleData(p + vec3(0.0, 0.0, stepSize)) - sampleData(p - vec3(0.0, 0.0, stepSize));
//     return normalize(vec3(dx, dy, dz));
// }