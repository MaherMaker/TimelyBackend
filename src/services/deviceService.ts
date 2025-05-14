import DeviceModelInstance, { findDeviceByUserIdAndDeviceId, updateDeviceFcmToken as updateDeviceFcmTokenInModel, Device } from '../models/Device';

export async function registerOrUpdateDevice(
  user_id: number,
  device_id: string,
  device_name: string,
  fcm_token?: string
): Promise<Device | undefined> {
  let device = await findDeviceByUserIdAndDeviceId(user_id, device_id);

  if (device) {
    let needsUpdate = false;
    if (device.device_name !== device_name) {
        needsUpdate = true;
    }
    const currentFcmToken = device.fcm_token ?? null;
    const newFcmToken = fcm_token ?? null;

    if (newFcmToken !== currentFcmToken) {
        needsUpdate = true;
    }

    if (needsUpdate) {
        // Use the .create() method from the DeviceModel instance for updates/creation logic as defined in Device.ts
        device = await DeviceModelInstance.create({ 
            user_id, 
            device_id, 
            device_name, 
            fcm_token: newFcmToken
        });
    } 
  } else {
    // Use the .create() method from the DeviceModel instance for creation
    device = await DeviceModelInstance.create({ 
        user_id, 
        device_id, 
        device_name, 
        fcm_token: fcm_token ?? null
    });
  }
  return device;
}

export async function updateDeviceFcmToken(
    user_id: number,
    device_id: string,
    fcm_token: string
): Promise<Device | undefined> {
    // Call the imported and aliased model function to avoid recursion
    return updateDeviceFcmTokenInModel(user_id, device_id, fcm_token);
}
